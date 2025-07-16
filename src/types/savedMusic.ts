// src/types/savedMusic.ts
// SavedMusic type for representing saved music items in the app
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
  tags: string[];
  firebaseId?: string;
}
