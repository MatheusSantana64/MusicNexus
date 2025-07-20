// src/services/deezer/deezerDataEnricher.ts
// Fetch and enrich Deezer data with batch requests and caching
import { MusicTrack, MusicAlbum, SearchOptions } from '../../types';
import { DeezerApiClient } from './deezerApiClient';
import { MusicSortingUtils } from '../../utils/musicSortingUtils';
import { CacheService } from '../music/musicCacheService';
import { DeezerBatchRequestService } from './deezerBatchRequestService';
import { safeParseMusicTrack } from '../../utils/validators';

export class DeezerDataEnricher {
  static async fetchAndSortAlbums(options: SearchOptions): Promise<MusicAlbum[]> {
    const validatedResponse = await DeezerApiClient.searchAlbumsRaw(options.query.trim(), options.limit || 25);
    let albums = validatedResponse.data || [];

    // Enrich and sort albums with batching
    albums = await this.enrichAlbumsWithReleaseData(albums);
    return MusicSortingUtils.sortAlbumsByReleaseDate(albums);
  }

  // Fetch tracks using batch requests and smart caching
  static async fetchTracksFromAlbums(albums: MusicAlbum[]): Promise<MusicTrack[]> {
    const allTracks: MusicTrack[] = [];
    
    console.log(`📦 Starting track fetching for ${albums.length} albums`);
    
    // Process albums in smaller batches to avoid overwhelming the API
    const albumBatches = this.chunkArray(albums, 5);
    
    for (const batch of albumBatches) {
      const batchPromises = batch.map(async (album) => {
        try {
          const validTracks = await DeezerApiClient.getAlbumTracks(album.id);
          return validTracks.map((track: MusicTrack) => this.enrichTrackWithAlbumData(track, album));
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

  // Use batch requests for album data enrichment
  static async enrichAlbumsWithReleaseData(albums: MusicAlbum[]): Promise<MusicAlbum[]> {
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
        const albumData = await DeezerBatchRequestService.requestAlbum(album.id);
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

  // Enrich tracks with album position data
  static async enrichTracksWithAlbumData(tracks: MusicTrack[]): Promise<MusicTrack[]> {
    console.log(`📦 Enriching ${tracks.length} tracks with position data`);

    const enrichedTracks = await Promise.all(
      tracks.map(async (track) => {
        try {
          // Get album tracks to ensure we have track_position and disk_number
          const albumTracks = await DeezerApiClient.getAlbumTracks(track.album.id);
          const matchingTrack = albumTracks.find((albumTrack: any) => albumTrack.id === track.id);
          
          // Also get full album data to ensure we have release_date
          const albumData = await DeezerBatchRequestService.requestAlbum(track.album.id);
          
          if (matchingTrack) {
            // Use album track data for position info (this fixes Quick Search)
            return {
              ...track,
              track_position: matchingTrack.track_position,
              disk_number: matchingTrack.disk_number,
              release_date: albumData.release_date || matchingTrack.release_date || track.album.release_date,
              album: {
                ...track.album,
                release_date: albumData.release_date || track.album.release_date
              }
            };
          }

          return {
            ...track,
            release_date: albumData.release_date || track.album.release_date || track.release_date,
            album: {
              ...track.album,
              release_date: albumData.release_date || track.album.release_date
            }
          };
        } catch (error) {
          console.warn(`Failed to enrich track ${track.id}:`, error);
          return {
            ...track,
            release_date: track.album.release_date || track.release_date,
          };
        }
      })
    );
    
    console.log(`✅ Enhanced ${enrichedTracks.length} tracks`);
    return enrichedTracks;
  }

  // === DATA ENRICHMENT ===
  static enrichTrackWithAlbumData(track: any, album: MusicAlbum): MusicTrack {
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

  // 🚀 OPTIMIZE: Pre-warm cache for common searches
  static preWarmCache(albumIds: string[]): void {
    // Pre-fetch popular albums in background without blocking the main thread
    setTimeout(async () => {
      for (const albumId of albumIds.slice(0, 5)) {
        try {
          const cacheKey = `album-tracks-${albumId}`;
          if (!CacheService.get(CacheService.trackCache, cacheKey)) {
            // Pre-fetch in the background without blocking
            const albumTracks = await DeezerApiClient.getAlbumTracks(albumId);
            CacheService.set(CacheService.trackCache, cacheKey, albumTracks, 30 * 60 * 1000); // 30 minutes
          }
        } catch (error) {
          // Ignore pre-warm errors - this is background optimization
          console.debug('Pre-warm cache failed for album:', albumId);
        }
      }
    }, 100);
  }

  // Fix the chunk method with proper typing
  private static chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}