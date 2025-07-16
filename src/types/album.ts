// src/types/album.ts
// Album types for Deezer API responses
import { DeezerTrack } from './track';

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
