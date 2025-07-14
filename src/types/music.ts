// src/types/music.ts
// Types related to music, tracks, albums, and search functionality
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
    release_date: string;
  };
  duration: number;
  preview: string;
  rank: number;
  track_position?: number;
  disk_number?: number;
  release_date?: string;
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
  tracks?: {
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
  releaseDate: string;
  trackPosition: number;
  diskNumber: number;
  savedAt: Date;
  firebaseId?: string;
}

export type SearchMode = 'album' | 'quick';

export interface SearchOptions {
  mode: SearchMode;
  query: string;
  limit?: number;
}