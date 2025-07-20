// src/types/track.ts
// Track types for music API responses (Spotify/Deezer)
export interface MusicTrack {
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

export interface MusicSearchResponse {
  data: MusicTrack[];
  total: number;
  next?: string;
}
