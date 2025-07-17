// src/types/savedMusic.ts
// SavedMusic type for representing saved music items in the app
export interface RatingHistoryEntry {
  rating: number;
  timestamp: string; // ISO string
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
  rating: number | null;
  releaseDate: string;
  trackPosition: number;
  diskNumber: number | null;
  savedAt: Date | null;
  tags: string[];
  firebaseId?: string;
  ratingHistory?: RatingHistoryEntry[];
}
