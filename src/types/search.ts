// src/types/search.ts
// Search types for handling music search functionality
export type SearchMode = 'spotify_album' | 'spotify_quick' | 'deezer_album' | 'deezer_quick';

export interface SearchOptions {
  mode: SearchMode;
  query: string;
  limit?: number;
}
