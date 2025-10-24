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
  duration: number;
  rating: number;
  releaseDate: string;
  trackPosition: number;
  diskNumber: number;
  savedAt: Date;
  tags: string[];
  firebaseId?: string;
  ratingHistory?: RatingHistoryEntry[];
  lastModified?: number; // Per-document last modified timestamp (ms since epoch). Optional so older cached items keep working.
}
