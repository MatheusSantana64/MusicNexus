// src/services/deezer/deezerSearchService.ts
// DeezerSearchService for searching tracks by album or quick search
// This service handles both album-based searches and quick searches for tracks
import { MusicTrack, SearchOptions } from '../../types';
import { DeezerApiClient } from './deezerApiClient';
import { DeezerDataEnricher } from './deezerDataEnricher';
import { MusicSortingUtils } from '../../utils/musicSortingUtils';

export class DeezerSearchService {
  static async searchTracksByAlbum(options: SearchOptions): Promise<MusicTrack[]> {
    try {
      if (!options.query?.trim()) return [];

      const startTime = Date.now();

      // Step 1: Search albums (1 API call)
      const albums = await DeezerDataEnricher.fetchAndSortAlbums(options);
      if (albums.length === 0) return [];

      // Step 2: Get tracks with batching (much fewer API calls)
      const allTracks = await DeezerDataEnricher.fetchTracksFromAlbums(albums);
      const sortedTracks = MusicSortingUtils.sortTracksByAlbumOrder(allTracks);

      const endTime = Date.now();
      
      return sortedTracks;
    } catch (error) {
      console.error('Error searching tracks by album:', error);
      throw new Error('Failed to search albums. Please check your internet connection.');
    }
  }

  static async searchTracksQuick(options: SearchOptions): Promise<MusicTrack[]> {
    try {
      if (!options.query?.trim()) return [];

      const startTime = Date.now();

      const validatedResponse = await DeezerApiClient.searchTracksRaw(options.query, options.limit || 25);
      if (!validatedResponse) {
        return [];
      }

      let tracks = validatedResponse.data || [];
      
      // Step 3: Enrich tracks with album data fetching
      tracks = await DeezerDataEnricher.enrichTracksWithAlbumData(tracks);
      tracks = MusicSortingUtils.sortTracksByAlbumOrder(tracks);
      
      const endTime = Date.now();
      
      return tracks;
    } catch (error) {
      console.error('Error searching tracks quick:', error);
      throw new Error('Failed to search songs. Please check your internet connection.');
    }
  }
}