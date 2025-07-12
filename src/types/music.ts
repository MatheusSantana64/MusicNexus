export interface DeezerTrack {
  id: string;
  title: string;
  title_short: string;
  artist: {
    id: string;
    name: string;
    picture: string;
    picture_small: string;
    picture_medium: string;
  };
  album: {
    id: string;
    title: string;
    cover: string;
    cover_small: string;
    cover_medium: string;
    cover_big: string;
    release_date: string; // Format: "YYYY-MM-DD"
  };
  duration: number;
  preview: string;
  rank: number;
  track_position?: number; // Position of track in the album
  disk_number?: number; // Disk number for multi-disk albums
  release_date?: string; // Some tracks have this field directly
}

export interface DeezerSearchResponse {
  data: DeezerTrack[];
  total: number;
  next?: string;
}

export interface DeezerAlbum {
  id: string;
  title: string;
  cover: string;
  cover_small: string;
  cover_medium: string;
  cover_big: string;
  release_date: string;
  artist: {
    id: string;
    name: string;
    picture: string;
    picture_small: string;
    picture_medium: string;
  };
  tracks: {
    data: DeezerTrack[];
  };
}

export interface DeezerAlbumSearchResponse {
  data: DeezerAlbum[];
  total: number;
  next?: string;
}

export interface SavedMusic {
  id: string;
  title: string;
  artist: string;
  artistId: string;
  album: string;
  albumId: string;
  coverUrl: string;
  preview: string;
  duration: number;
  rating: number;
  releaseDate: string; // Format: "YYYY-MM-DD"
  trackPosition: number; // Position of track in the album
  diskNumber: number; // Disk number for multi-disk albums
  savedAt: Date;
  firebaseId?: string;
  source: 'deezer' | 'spotify' | 'tidal';
}

// Tipos para os modos de pesquisa - apenas 2 opções agora
export type SearchMode = 'album' | 'default';

export interface SearchOptions {
  mode: SearchMode;
  query: string;
  limit?: number;
}