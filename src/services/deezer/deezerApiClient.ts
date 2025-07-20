// src/services/deezer/deezerApiClient.ts
// Deezer API client for fetching tracks and albums
// This client handles API requests, caching, and data validation
import { MusicTrack, MusicAlbum, MusicSearchResponse, MusicAlbumSearchResponse } from '../../types';
import { CacheService } from './deezerCacheService';
import { 
  validateMusicAlbumSearchResponse,
  safeParseMusicTrack,
  safeParseMusicSearchResponse
} from '../../utils/validators';
import { searchSpotifyTrack } from '../spotify/spotifyApiClient';

const DEEZER_API_URL = 'https://api.deezer.com';

export class DeezerApiClient {
  static async getTrackById(trackId: string): Promise<MusicTrack | null> {
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

      const rawData = await response.json();
      
      // 🛡️ VALIDATE WITH ZOD
      const validatedTrack = safeParseMusicTrack(rawData);
      if (!validatedTrack) {
        console.error('Invalid track data received from API:', rawData);
        // 🔥 Fallback to Spotify
        const spotifyTrack = await searchSpotifyTrack(trackId);
        if (spotifyTrack) {
          console.log(`✅ Track ${trackId} found on Spotify`);
          CacheService.setTrack(trackId, spotifyTrack);
          return spotifyTrack;
        }
        return null;
      }

      CacheService.setTrack(trackId, validatedTrack);
      return validatedTrack;
    } catch (error) {
      console.error('Error fetching track by ID:', error);
      return null;
    }
  }

  static async searchTracksRaw(query: string, limit: number): Promise<MusicSearchResponse | null> {
    const encodedQuery = encodeURIComponent(query.trim());
    const response = await fetch(`${DEEZER_API_URL}/search?q=${encodedQuery}&limit=${limit}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const rawData = await response.json();

    // 🛡️ VALIDATE WITH ZOD
    const validatedResponse = safeParseMusicSearchResponse(rawData);
    if (!validatedResponse) {
      console.error('Invalid search response from API:', rawData);
      return null;
    }

    return validatedResponse;
  }

  static async searchAlbumsRaw(query: string, limit: number): Promise<MusicAlbumSearchResponse> {
    const encodedQuery = encodeURIComponent(query.trim());
    const albumResponse = await fetch(
      `${DEEZER_API_URL}/search/album?q=${encodedQuery}&limit=${Math.min(limit, 15)}`
    );

    if (!albumResponse.ok) {
      throw new Error(`HTTP error! status: ${albumResponse.status}`);
    }

    const rawData = await albumResponse.json();
    
    // 🛡️ VALIDATE WITH ZOD
    return validateMusicAlbumSearchResponse(rawData);
  }

  static async getAlbumTracks(albumId: string): Promise<MusicTrack[]> {
    const albumTracksResponse = await fetch(`${DEEZER_API_URL}/album/${albumId}/tracks`);
    
    if (!albumTracksResponse.ok) {
      return [];
    }

    const rawData = await albumTracksResponse.json();
    
    // 🛡️ VALIDATE EACH TRACK
    return (rawData.data || [])
      .map((track: unknown) => safeParseMusicTrack(track))
      .filter((track: MusicTrack | null): track is MusicTrack => track !== null);
  }
}