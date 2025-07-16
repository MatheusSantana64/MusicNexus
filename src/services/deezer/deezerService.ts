// src/services/deezerService.ts
import { DeezerTrack, SearchMode, SearchOptions } from '../../types/music';
import { DeezerApiClient } from './deezerApiClient';
import { DeezerSearchService } from './deezerSearchService';
import { CacheService } from './deezerCacheService';
import { BatchRequestService } from '../batchRequestService';

export class DeezerService {
  // === PUBLIC API METHODS ===
  
  static async searchTracks(query: string, mode: SearchMode = 'album', limit: number = 25): Promise<DeezerTrack[]> {
    const options: SearchOptions = { mode, query, limit };
    
    const searchMethods = {
      album: DeezerSearchService.searchTracksByAlbum,
      quick: DeezerSearchService.searchTracksQuick,
    };
    
    return (searchMethods[mode] || searchMethods.album).call(null, options);
  }

  static async getTrackById(trackId: string): Promise<DeezerTrack | null> {
    return DeezerApiClient.getTrackById(trackId);
  }

  // === PUBLIC UTILITIES ===

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
      album: 'By album',
      quick: 'Quick search',
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