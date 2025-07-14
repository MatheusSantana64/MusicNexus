// src/services/deezer/deezerApiClient.ts
import { DeezerTrack, DeezerAlbum, DeezerSearchResponse, DeezerAlbumSearchResponse } from '../../types/music';
import { CacheService } from '../cacheService';
import { 
  validateDeezerAlbumSearchResponse,
  safeParseDeezerTrack,
  safeParseDeezerSearchResponse
} from '../../utils/validators';

const DEEZER_API_URL = 'https://api.deezer.com';

export class DeezerApiClient {
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

      const rawData = await response.json();
      
      // 🛡️ VALIDATE WITH ZOD
      const validatedTrack = safeParseDeezerTrack(rawData);
      if (!validatedTrack) {
        console.error('Invalid track data received from API:', rawData);
        return null;
      }

      CacheService.setTrack(trackId, validatedTrack);
      return validatedTrack;
    } catch (error) {
      console.error('Error fetching track by ID:', error);
      return null;
    }
  }

  static async searchTracksRaw(query: string, limit: number): Promise<DeezerSearchResponse | null> {
    const encodedQuery = encodeURIComponent(query.trim());
    const response = await fetch(`${DEEZER_API_URL}/search?q=${encodedQuery}&limit=${limit}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const rawData = await response.json();

    // 🛡️ VALIDATE WITH ZOD
    const validatedResponse = safeParseDeezerSearchResponse(rawData);
    if (!validatedResponse) {
      console.error('Invalid search response from API:', rawData);
      return null;
    }

    return validatedResponse;
  }

  static async searchAlbumsRaw(query: string, limit: number): Promise<DeezerAlbumSearchResponse> {
    const encodedQuery = encodeURIComponent(query.trim());
    const albumResponse = await fetch(
      `${DEEZER_API_URL}/search/album?q=${encodedQuery}&limit=${Math.min(limit, 15)}`
    );

    if (!albumResponse.ok) {
      throw new Error(`HTTP error! status: ${albumResponse.status}`);
    }

    const rawData = await albumResponse.json();
    
    // 🛡️ VALIDATE WITH ZOD
    return validateDeezerAlbumSearchResponse(rawData);
  }

  static async getAlbumTracks(albumId: string): Promise<DeezerTrack[]> {
    const albumTracksResponse = await fetch(`${DEEZER_API_URL}/album/${albumId}/tracks`);
    
    if (!albumTracksResponse.ok) {
      return [];
    }

    const rawData = await albumTracksResponse.json();
    
    // 🛡️ VALIDATE EACH TRACK
    return (rawData.data || [])
      .map((track: unknown) => safeParseDeezerTrack(track))
      .filter((track: DeezerTrack | null): track is DeezerTrack => track !== null);
  }
}