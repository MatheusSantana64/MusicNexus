// src/services/deezerService.ts
// Deezer service for searching tracks and albums
import { DeezerSearchResponse, DeezerTrack, DeezerAlbumSearchResponse, DeezerAlbum, SearchMode, SearchOptions } from '../types/music';
import { compareDates } from '../utils/dateUtils';
import { CacheService } from './cacheService';
import { BatchRequestService } from './batchRequestService';

// === CONSTANTS & CONFIGURATION ===
const DEEZER_API_URL = 'https://api.deezer.com';

export class DeezerService {
  // === PUBLIC API METHODS ===
  
  static async searchTracks(query: string, mode: SearchMode = 'album', limit: number = 25): Promise<DeezerTrack[]> {
    const options: SearchOptions = { mode, query, limit };
    
    const searchMethods = {
      album: this.searchTracksByAlbum,
      quick: this.searchTracksQuick,
    };
    
    return (searchMethods[mode] || searchMethods.album).call(this, options);
  }

  static async getTrackById(trackId: string): Promise<DeezerTrack | null> {
    try {
      // Check cache first
      const cached = CacheService.getTrack(trackId);
      if (cached) {
        console.log(`✅ Track ${trackId} served from cache`);
        return cached;
      }

      const response = await fetch(`${DEEZER_API_URL}/track/${trackId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const track = await response.json();
      CacheService.setTrack(trackId, track);
      return track;
    } catch (error) {
      console.error('Error fetching track by ID:', error);
      return null;
    }
  }

  // === OPTIMIZED SEARCH IMPLEMENTATIONS ===

  private static async searchTracksByAlbum(options: SearchOptions): Promise<DeezerTrack[]> {
    try {
      if (!options.query?.trim()) return [];

      console.log(`🔍 [ALBUM MODE] Starting search for: "${options.query}"`);
      const startTime = Date.now();

      // Step 1: Search albums (1 API call)
      const albums = await this.fetchAndSortAlbums(options);
      if (albums.length === 0) return [];

      console.log(`📀 Found ${albums.length} albums`);

      // Step 2: Get tracks with optimized batching (much fewer API calls)
      const allTracks = await this.fetchTracksFromAlbumsOptimized(albums);
      const sortedTracks = this.sortTracksByAlbumOrder(allTracks);

      const endTime = Date.now();
      console.log(`✅ [ALBUM MODE] Completed in ${endTime - startTime}ms: ${sortedTracks.length} tracks`);
      
      return sortedTracks;
    } catch (error) {
      console.error('Error searching tracks by album:', error);
      throw new Error('Falha ao pesquisar álbuns. Verifique sua conexão com a internet.');
    }
  }

  private static async searchTracksQuick(options: SearchOptions): Promise<DeezerTrack[]> {
    try {
      if (!options.query?.trim()) return [];

      console.log(`⚡ [QUICK MODE] Starting search for: "${options.query}"`);
      const startTime = Date.now();

      const encodedQuery = encodeURIComponent(options.query.trim());
      const response = await fetch(`${DEEZER_API_URL}/search?q=${encodedQuery}&limit=${options.limit}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: DeezerSearchResponse = await response.json();
      let tracks = data.data || [];

      console.log(`🎵 Found ${tracks.length} tracks`);
      
      // Step 3: Enrich tracks with optimized album data fetching
      tracks = await this.enrichTracksWithAlbumDataOptimized(tracks);
      tracks = this.sortTracksByAlbumOrder(tracks);
      
      const endTime = Date.now();
      console.log(`✅ [QUICK MODE] Completed in ${endTime - startTime}ms: ${tracks.length} tracks`);
      
      return tracks;
    } catch (error) {
      console.error('Error searching tracks quick:', error);
      throw new Error('Falha ao pesquisar músicas. Verifique sua conexão com a internet.');
    }
  }

  // === OPTIMIZED ALBUM PROCESSING ===

  private static async fetchAndSortAlbums(options: SearchOptions): Promise<DeezerAlbum[]> {
    const encodedQuery = encodeURIComponent(options.query.trim());
    const albumResponse = await fetch(
      `${DEEZER_API_URL}/search/album?q=${encodedQuery}&limit=${Math.min(options.limit || 25, 15)}`
    );

    if (!albumResponse.ok) {
      throw new Error(`HTTP error! status: ${albumResponse.status}`);
    }

    const albumData: DeezerAlbumSearchResponse = await albumResponse.json();
    let albums = albumData.data || [];

    // Enrich and sort albums with optimized batching
    albums = await this.enrichAlbumsWithReleaseDataOptimized(albums);
    return this.sortAlbumsByReleaseDate(albums);
  }

  // 🚀 OPTIMIZED: Fetch tracks using batch requests and smart caching
  private static async fetchTracksFromAlbumsOptimized(albums: DeezerAlbum[]): Promise<DeezerTrack[]> {
    const allTracks: DeezerTrack[] = [];
    
    console.log(`📦 Starting optimized track fetching for ${albums.length} albums`);
    
    // Process albums in smaller batches to avoid overwhelming the API
    const albumBatches = this.chunkArray(albums, 5);
    
    for (const batch of albumBatches) {
      const batchPromises = batch.map(async (album) => {
        try {
          const albumTracksResponse = await fetch(`${DEEZER_API_URL}/album/${album.id}/tracks`);
          
          if (albumTracksResponse.ok) {
            const albumTracksData = await albumTracksResponse.json();
            const enrichedTracks = (albumTracksData.data || []).map((track: any) => 
              this.enrichTrackWithAlbumData(track, album)
            );
            return enrichedTracks;
          }
          return [];
        } catch (error) {
          console.warn(`Failed to fetch tracks for album ${album.id}:`, error);
          return [];
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);
      
      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          allTracks.push(...result.value);
        }
      }
    }

    console.log(`✅ Fetched ${allTracks.length} tracks total`);
    return allTracks;
  }

  // 🚀 OPTIMIZED: Use batch requests for album data enrichment
  private static async enrichAlbumsWithReleaseDataOptimized(albums: DeezerAlbum[]): Promise<DeezerAlbum[]> {
    const albumsToEnrich = albums.filter(album => !album.release_date);
    const albumsWithData = albums.filter(album => album.release_date);
    
    if (albumsToEnrich.length === 0) {
      console.log(`✅ All ${albums.length} albums already have release data`);
      return albums;
    }

    console.log(`📦 Enriching ${albumsToEnrich.length} albums with release data`);

    // Use batch requests to get album data
    const enrichmentPromises = albumsToEnrich.map(async (album) => {
      try {
        const albumData = await BatchRequestService.requestAlbum(album.id);
        return { ...album, release_date: albumData.release_date || '' };
      } catch (error) {
        console.warn(`Failed to fetch detailed data for album ${album.id}:`, error);
        return album;
      }
    });

    const enrichedAlbums = await Promise.all(enrichmentPromises);
    
    console.log(`✅ Enriched ${enrichedAlbums.length} albums`);
    return [...albumsWithData, ...enrichedAlbums];
  }

  // 🚀 OPTIMIZED: Smart album data enrichment with aggressive caching
  private static async enrichTracksWithAlbumDataOptimized(tracks: DeezerTrack[]): Promise<DeezerTrack[]> {
    const albumIds = new Set<string>();
    const albumDataMap = new Map<string, any>();
    const albumTracksMap = new Map<string, DeezerTrack[]>();

    // Collect unique album IDs
    tracks.forEach(track => {
      if (track.album?.id) {
        albumIds.add(track.album.id);
      }
    });

    const uniqueAlbumIds = Array.from(albumIds);
    console.log(`📦 Enriching ${tracks.length} tracks from ${uniqueAlbumIds.length} unique albums`);

    // Check cache first
    const cachedAlbums = CacheService.getAlbumsBatch(uniqueAlbumIds);
    const uncachedAlbumIds = uniqueAlbumIds.filter(id => !cachedAlbums.has(id));
    
    console.log(`✅ Found ${cachedAlbums.size} albums in cache, need to fetch ${uncachedAlbumIds.length}`);

    // Add cached data to maps
    for (const [albumId, albumData] of cachedAlbums) {
      albumDataMap.set(albumId, albumData);
    }

    // Fetch uncached albums using batch requests
    if (uncachedAlbumIds.length > 0) {
      const batchPromises = uncachedAlbumIds.map(async (albumId) => {
        try {
          // Get album data using batch service
          const albumData = await BatchRequestService.requestAlbum(albumId);
          albumDataMap.set(albumId, albumData);

          // Always fetch tracks separately to ensure we have track_position
          const albumTracksResponse = await fetch(`${DEEZER_API_URL}/album/${albumId}/tracks`);
          if (albumTracksResponse.ok) {
            const albumTracksData = await albumTracksResponse.json();
            albumTracksMap.set(albumId, albumTracksData.data || []);
          }
        } catch (error) {
          console.warn(`Failed to fetch album data for ${albumId}:`, error);
        }
      });

      await Promise.allSettled(batchPromises);
      console.log(`✅ Fetched ${uncachedAlbumIds.length} albums from API`);
    }

    // Enrich tracks with album data and track position
    const enrichedTracks = tracks.map(track => {
      const albumData = albumDataMap.get(track.album?.id);
      const albumTracks = albumTracksMap.get(track.album?.id);
      
      // Find the corresponding track in the album to get track_position and disk_number
      let trackPosition = track.track_position;
      let diskNumber = track.disk_number;
      
      if (albumTracks) {
        const matchingTrack = albumTracks.find((albumTrack: any) => albumTrack.id === track.id);
        if (matchingTrack) {
          trackPosition = matchingTrack.track_position;
          diskNumber = matchingTrack.disk_number;
        }
      }
      
      const enrichedTrack: DeezerTrack = {
        ...track,
        track_position: trackPosition,
        disk_number: diskNumber,
        album: {
          ...track.album,
          release_date: albumData?.release_date || track.album.release_date,
        }
      };

      return enrichedTrack;
    });

    return enrichedTracks;
  }

  // === UTILITY METHODS ===

  private static chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  // === SORTING UTILITIES (unchanged) ===

  private static sortAlbumsByReleaseDate(albums: DeezerAlbum[]): DeezerAlbum[] {
    return albums.sort((a, b) => {
      if (a.release_date && b.release_date) {
        const dateComparison = compareDates(b.release_date, a.release_date);
        if (dateComparison !== 0) return dateComparison;
      }
      
      if (a.release_date && !b.release_date) return -1;
      if (!a.release_date && b.release_date) return 1;
      return a.title.localeCompare(b.title);
    });
  }

  private static sortTracksByAlbumOrder(tracks: DeezerTrack[]): DeezerTrack[] {
    return tracks.sort((a, b) => {
      if (a.album.release_date && b.album.release_date) {
        const dateComparison = compareDates(b.album.release_date, a.album.release_date);
        if (dateComparison !== 0) return dateComparison;
      }
      
      if (a.album.release_date && !b.album.release_date) return -1;
      if (!a.album.release_date && b.album.release_date) return 1;
      
      const albumComparison = a.album.title.localeCompare(b.album.title);
      if (albumComparison !== 0) return albumComparison;
      
      const diskA = a.disk_number || 1;
      const diskB = b.disk_number || 1;
      if (diskA !== diskB) return diskA - diskB;
      
      const trackPosA = a.track_position || 999;
      const trackPosB = b.track_position || 999;
      return trackPosA - trackPosB;
    });
  }

  // === DATA ENRICHMENT (unchanged) ===

  private static enrichTrackWithAlbumData(track: any, album: DeezerAlbum): DeezerTrack {
    return {
      ...track,
      album: {
        id: album.id,
        title: album.title,
        cover: album.cover,
        cover_small: album.cover_small,
        cover_medium: album.cover_medium,
        cover_big: album.cover_big,
        release_date: album.release_date,
      },
      artist: album.artist,
    };
  }

  // === PUBLIC UTILITIES (unchanged) ===

  static getTrackReleaseDate(track: DeezerTrack): string | null {
    return track.album?.release_date || track.release_date || null;
  }

  static getTrackPosition(track: DeezerTrack): string | null {
    if (!track.track_position && track.track_position !== 0) return null;
    
    const position = track.track_position.toString();
    return track.disk_number && track.disk_number > 1 
      ? `${track.disk_number}.${position}` 
      : position;
  }

  static getReleaseYear(track: DeezerTrack): string | null {
    const releaseDate = this.getTrackReleaseDate(track);
    if (!releaseDate) return null;
    
    try {
      return new Date(releaseDate).getFullYear().toString();
    } catch {
      return releaseDate.split('-')[0] || null;
    }
  }

  static getSearchModeDescription(mode: SearchMode): string {
    const descriptions = {
      album: 'Por álbum completo',
      quick: 'Busca rápida',
    };
    return descriptions[mode] || descriptions.album;
  }

  // === CACHE MANAGEMENT ===

  static clearCaches(): void {
    CacheService.clearAll();
    BatchRequestService.clearQueue();
  }

  static getCacheStats() {
    return {
      cache: CacheService.getStats(),
      queue: BatchRequestService.getQueueStatus(),
    };
  }
}