// src/services/music/musicSearchService.ts
// MusicSearchService for searching tracks across multiple APIs (Spotify/Deezer)
import { MusicTrack, SearchMode, SearchOptions } from '../../types';
import { DeezerApiClient } from '../deezer/deezerApiClient';
import { DeezerSearchService } from '../deezer/deezerSearchService';
import { CacheService } from './musicCacheService';
import { DeezerBatchRequestService } from '../deezer/deezerBatchRequestService';
import { searchSpotifyTrack, searchSpotifyArtistTracks, spotifyUnifiedSearch, getSpotifyAccessToken } from '../spotify/spotifyApiClient';

// 🚀 NEW: Fetch tracks for a Spotify album
async function fetchSpotifyAlbumTracks(albumId: string): Promise<MusicTrack[]> {
  const token = await getSpotifyAccessToken();
  const response = await fetch(`https://api.spotify.com/v1/albums/${albumId}/tracks?limit=50`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) {
    console.error('Spotify album tracks API error:', await response.text());
    return [];
  }
  const data = await response.json();
  // Map Spotify tracks to MusicTrack-like objects
  return (data.items || []).map((track: any) => ({
    id: track.id,
    title: track.name,
    title_short: track.name,
    artist: {
      id: track.artists[0]?.id || '',
      name: track.artists[0]?.name || '',
      picture: '',
      picture_small: '',
      picture_medium: '',
    },
    album: {
      id: albumId,
      title: '', // Will be filled below
      cover: '',
      cover_small: '',
      cover_medium: '',
      cover_big: '',
      release_date: '', // Will be filled below
    },
    duration: Math.floor(track.duration_ms / 1000),
    preview: track.preview_url || '',
    rank: 0,
    track_position: track.track_number,
    disk_number: track.disc_number,
    release_date: '', // Will be filled below
  }));
}

export class MusicSearchService {
  // === PUBLIC API METHODS ===
  static async searchTracks(query: string, mode: SearchMode = 'spotify_album', limit: number = 25): Promise<MusicTrack[]> {
    let formattedQuery = query;
    if (mode === 'spotify_album' || mode === 'deezer_album') {
      // Only search for artist or album, never track title
      // If query contains " - ", treat as "artist - album"
      if (query.includes(' - ')) {
        const [artist, album] = query.split(' - ');
        formattedQuery = `artist:"${artist.trim()}" album:"${album.trim()}"`;
      } else {
        // Otherwise, treat as artist search
        formattedQuery = `artist:"${query.trim()}"`;
      }
    }
    const options: SearchOptions = { mode, query: formattedQuery, limit };

    const searchMethods = {
      spotify_album: async (opts: SearchOptions) => {
        try {
          // Spotify album search (use unified search, filter albums)
          const result = await spotifyUnifiedSearch(opts.query, ['album'], opts.limit || 10);
          // Fetch tracks from albums
          const allTracks: MusicTrack[] = [];
          const albumTrackPromises = result.albums.map(async (album) => {
            const albumTracks = await fetchSpotifyAlbumTracks(album.id);
            albumTracks.forEach(track => {
              track.album.title = album.title;
              track.album.cover = album.cover;
              track.album.cover_small = album.cover_small;
              track.album.cover_medium = album.cover_medium;
              track.album.cover_big = album.cover_big;
              track.album.release_date = album.release_date;
              track.artist = album.artist;
              track.release_date = album.release_date;
            });
            return albumTracks;
          });
          const albumTracksArrays = await Promise.all(albumTrackPromises);
          albumTracksArrays.forEach(tracks => allTracks.push(...tracks));
          return allTracks;
        } catch (e) {
          // Fallback to Deezer
          return searchMethods.deezer_album(opts);
        }
      },
      spotify_quick: async (opts: SearchOptions) => {
        try {
          // Spotify quick search (tracks only)
          const result = await spotifyUnifiedSearch(opts.query, ['track'], opts.limit || 10);
          return result.tracks;
        } catch (e) {
          return searchMethods.deezer_quick(opts);
        }
      },
      deezer_album: DeezerSearchService.searchTracksByAlbum,
      deezer_quick: DeezerSearchService.searchTracksQuick,
    };

    return (searchMethods[mode] || searchMethods.spotify_album).call(null, options);
  }

  static async getTrackById(trackId: string): Promise<MusicTrack | null> {
    return DeezerApiClient.getTrackById(trackId);
  }

  // === PUBLIC UTILITIES ===

  static getTrackReleaseDate(track: MusicTrack): string | null {
    return track.album?.release_date || track.release_date || null;
  }

  static getTrackPosition(track: MusicTrack): string | null {
    if (!track.track_position && track.track_position !== 0) return null;
    
    const position = track.track_position.toString();
    return track.disk_number && track.disk_number > 1 
      ? `${track.disk_number}.${position}` 
      : position;
  }

  static getReleaseYear(track: MusicTrack): string | null {
    const releaseDate = this.getTrackReleaseDate(track);
    if (!releaseDate) return null;
    
    try {
      return new Date(releaseDate).getFullYear().toString();
    } catch {
      return releaseDate.split('-')[0] || null;
    }
  }

  static getSearchModeDescription(mode: SearchMode): string {
    const descriptions: Record<SearchMode, string> = {
      spotify_album: 'Spotify Album Search',
      spotify_quick: 'Spotify Quick Search',
      deezer_album: 'Deezer Album Search',
      deezer_quick: 'Deezer Quick Search',
    };
    return descriptions[mode] || descriptions.spotify_album;
  }

  // === CACHE MANAGEMENT ===

  static clearCaches(): void {
    CacheService.clearAll();
    DeezerBatchRequestService.clearQueue();
  }

  static getCacheStats() {
    return {
      cache: CacheService.getStats(),
      queue: DeezerBatchRequestService.getQueueStatus(),
    };
  }
}