// src/types/album.ts
// Album types for music API responses (Spotify/Deezer)
import { MusicTrack } from './track';

export interface MusicAlbum {
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
    data: MusicTrack[];
  };
}

export interface MusicAlbumSearchResponse {
  data: MusicAlbum[];
  total: number;
  next?: string;
}
