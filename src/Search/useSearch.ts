// src/Search/useSearch.ts
// useSearch hook for managing music search functionality
import { useState, useCallback, useRef, useEffect } from 'react';
import { MusicTrack, SearchMode } from '../types';
import { MusicSearchService } from '../services/music/musicSearchService';

// Search configuration
const SEARCH_CONFIG = {
  DEBOUNCE_DELAY: 800, // Debounce delay in milliseconds
} as const;

interface UseSearchResult {
  tracks: MusicTrack[];
  loading: boolean;
  error: string | null;
  searchMode: SearchMode;
  searchTracks: (query: string, mode?: SearchMode) => Promise<void>;
  loadMore: () => Promise<void>;
  setSearchMode: (mode: SearchMode) => void;
  clearResults: () => void;
  hasSearched: boolean;
}

export function useSearch(): UseSearchResult {
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchMode, setSearchMode] = useState<SearchMode>('tidal_album'); // Use TIDAL Album as default
  const [hasSearched, setHasSearched] = useState(false);
  const currentQueryRef = useRef('');
  const currentModeRef = useRef<SearchMode>('tidal_album');

  // Refs to control debounce and cancellation
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentSearchRef = useRef<string>('');
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Internal function to perform the actual search
  const performSearch = useCallback(async (query: string, mode: SearchMode) => {
    // Cancel previous request if it exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new AbortController for this search
    abortControllerRef.current = new AbortController();
    const searchId = Math.random().toString(36).substr(2, 9);
    currentSearchRef.current = searchId;

    setLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const results = await MusicSearchService.searchTracks(query, mode);

      // Verify if this is still the most recent search
      if (currentSearchRef.current === searchId) {
        setTracks(results);
      }
    } catch (err: unknown) {
      // Verify if this is still the most recent search and not cancelled
      if (currentSearchRef.current === searchId) {
        // Type guard to check if it's an abort error
        const isAbortError = err instanceof Error && err.name === 'AbortError';
        
        if (!isAbortError) {
          const errorMessage = err instanceof Error ? err.message : 'Unknown error';
          setError(errorMessage);
          setTracks([]);
          console.error(`[${searchId}] Search error:`, err);
        }
      }
    } finally {
      // Stop loading indicator if this is still the most recent search
      if (currentSearchRef.current === searchId) {
        setLoading(false);
      }
    }
  }, []);

  const searchTracks = useCallback(async (query: string, mode?: SearchMode) => {
    const currentMode = mode || searchMode;
    currentQueryRef.current = query.trim();
    currentModeRef.current = currentMode;
    
    // Cancel previous debounce timeout if it exists
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // If query is empty, clear results immediately
    if (!query || query.trim().length === 0) {
      setTracks([]);
      setError(null);
      setLoading(false);
      setHasSearched(false);
      currentSearchRef.current = '';
      return;
    }

    // Implement debounce configuration
    debounceTimeoutRef.current = setTimeout(() => {
      performSearch(query.trim(), currentMode);
    }, SEARCH_CONFIG.DEBOUNCE_DELAY);
  }, [performSearch, searchMode]);

  const loadMore = useCallback(async () => {
    const query = currentQueryRef.current;
    const mode = currentModeRef.current;
    if (!query || loading || !hasSearched) return;

    const searchId = Math.random().toString(36).substr(2, 9);
    currentSearchRef.current = searchId;
    setLoading(true);
    try {
      const results = await MusicSearchService.searchTracks(query, mode, tracks.length + 25);
      if (currentSearchRef.current === searchId) {
        const existingIds = new Set(tracks.map(track => track.id));
        setTracks(current => [
          ...current,
          ...results.filter(track => !existingIds.has(track.id)),
        ]);
      }
    } catch (err) {
      if (currentSearchRef.current === searchId) {
        console.error(`[${searchId}] Loading more search results failed:`, err);
      }
    } finally {
      if (currentSearchRef.current === searchId) setLoading(false);
    }
  }, [hasSearched, loading, tracks]);

  const handleSetSearchMode = useCallback((mode: SearchMode) => {
    setSearchMode(mode);
  }, []);

  const clearResults = useCallback(() => {
    // Cancel debounce timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Cancel ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Clear state
    setTracks([]);
    setError(null);
    setLoading(false);
    setHasSearched(false);
    currentSearchRef.current = '';
    currentQueryRef.current = '';
  }, []);

  return {
    tracks,
    loading,
    error,
    searchMode,
    searchTracks,
    loadMore,
    setSearchMode: handleSetSearchMode,
    clearResults,
    hasSearched,
  };
}