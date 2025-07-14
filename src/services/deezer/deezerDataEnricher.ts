// src/services/deezer/deezerDataEnricher.ts
import { DeezerTrack, DeezerAlbum, SearchOptions } from '../../types/music';
import { DeezerApiClient } from './deezerApiClient';
import { DeezerSortingUtils } from './deezerSortingUtils';
import { CacheService } from '../cacheService';
import { BatchRequestService } from '../batchRequestService';
import { safeParseDeezerTrack } from '../../utils/validators';

export class DeezerDataEnricher {
  static async fetchAndSortAlbums(options: SearchOptions): Promise<DeezerAlbum[]> {
    const validatedResponse = await DeezerApiClient.searchAlbumsRaw(options.query.trim(), options.limit || 25);
    let albums = validatedResponse.data || [];

    // Enrich and sort albums with optimized batching
    albums = await this.enrichAlbumsWithReleaseDataOptimized(albums);
    return DeezerSortingUtils.sortAlbumsByReleaseDate(albums);
  }

  // 🚀 OPTIMIZED: Fetch tracks using batch requests and smart caching
  static async fetchTracksFromAlbumsOptimized(albums: DeezerAlbum[]): Promise<DeezerTrack[]> {
    const allTracks: DeezerTrack[] = [];
    
    console.log(`📦 Starting optimized track fetching for ${albums.length} albums`);
    
    // Process albums in smaller batches to avoid overwhelming the API
    const albumBatches = this.chunkArray(albums, 5);
    
    for (const batch of albumBatches) {
      const batchPromises = batch.map(async (album) => {
        try {
          const validTracks = await DeezerApiClient.getAlbumTracks(album.id);
          return validTracks.map((track: DeezerTrack) => this.enrichTrackWithAlbumData(track, album));
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
  static async enrichAlbumsWithReleaseDataOptimized(albums: DeezerAlbum[]): Promise<DeezerAlbum[]> {
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
  static async enrichTracksWithAlbumDataOptimized(tracks: DeezerTrack[]): Promise<DeezerTrack[]> {
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

    // Check cache first for album data
    const cachedAlbums = CacheService.getAlbumsBatch(uniqueAlbumIds);
    const uncachedAlbumIds = uniqueAlbumIds.filter(id => !cachedAlbums.has(id));
    
    console.log(`✅ Found ${cachedAlbums.size} albums in cache, need to fetch ${uncachedAlbumIds.length}`);

    // Add cached album data to maps
    for (const [albumId, albumData] of cachedAlbums) {
      albumDataMap.set(albumId, albumData);
    }

    // Fetch uncached album data using batch requests
    if (uncachedAlbumIds.length > 0) {
      const albumDataPromises = uncachedAlbumIds.map(async (albumId) => {
        try {
          const albumData = await BatchRequestService.requestAlbum(albumId);
          albumDataMap.set(albumId, albumData);
          // Cache the album data for future use
          CacheService.setAlbum(albumId, albumData);
        } catch (error) {
          console.warn(`Failed to fetch album data for ${albumId}:`, error);
        }
      });

      await Promise.allSettled(albumDataPromises);
      console.log(`✅ Fetched ${uncachedAlbumIds.length} album data from API`);
    }

    // 🔧 ALWAYS fetch album tracks to get complete track data (track_position, disk_number)
    // This is crucial for Quick Search tracks that often lack this data
    const albumTracksPromises = uniqueAlbumIds.map(async (albumId) => {
      try {
        // Check if we already have tracks for this album cached
        const cacheKey = `album-tracks-${albumId}`;
        const cachedTracks = CacheService.get(CacheService.trackCache, cacheKey);
        
        if (cachedTracks) {
          albumTracksMap.set(albumId, cachedTracks);
          return;
        }

        // Fetch album tracks to get complete track information
        const albumTracks = await DeezerApiClient.getAlbumTracks(albumId);
        albumTracksMap.set(albumId, albumTracks);
        
        // Cache the album tracks for future use (shorter TTL since track data changes less frequently)
        CacheService.set(CacheService.trackCache, cacheKey, albumTracks, 10 * 60 * 1000); // 10 minutes
      } catch (error) {
        console.warn(`Failed to fetch album tracks for ${albumId}:`, error);
      }
    });

    await Promise.allSettled(albumTracksPromises);
    console.log(`✅ Fetched tracks data for ${uniqueAlbumIds.length} albums`);

    // Enrich tracks with complete album data and track position
    const enrichedTracks = tracks.map(track => {
      const albumData = albumDataMap.get(track.album?.id);
      const albumTracks = albumTracksMap.get(track.album?.id);
      
      // Find the corresponding track in the album to get complete track info
      let trackPosition = track.track_position;
      let diskNumber = track.disk_number;
      
      if (albumTracks) {
        const matchingTrack = albumTracks.find((albumTrack: any) => albumTrack.id === track.id);
        if (matchingTrack) {
          // 🔧 Always use album track data for position info (this fixes Quick Search)
          trackPosition = matchingTrack.track_position;
          diskNumber = matchingTrack.disk_number;
          
          console.log(`🔧 Enhanced track "${track.title}" with position: ${trackPosition}, disk: ${diskNumber}`);
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

  // === DATA ENRICHMENT ===
  static enrichTrackWithAlbumData(track: any, album: DeezerAlbum): DeezerTrack {
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

  // === UTILITY METHODS ===
  private static chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}