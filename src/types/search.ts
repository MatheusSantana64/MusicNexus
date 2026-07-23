// src/types/search.ts
// Search types for handling music search functionality
export type SearchMode =
  | 'tidal_album'
  | 'tidal_quick'
  | 'spotify_album'
  | 'spotify_quick'
  | 'deezer_album'
  | 'deezer_quick';

export interface SearchOptions {
  mode: SearchMode;
  query: string;
  limit?: number;
}
