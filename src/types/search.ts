// src/types/search.ts
// Search types for handling music search functionality
export type SearchMode = 'album' | 'quick';

export interface SearchOptions {
  mode: SearchMode;
  query: string;
  limit?: number;
}
