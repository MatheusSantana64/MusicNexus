// src/hooks/useSearch.ts
// Hook for searching music tracks using the Deezer API
import { useState, useCallback, useRef, useEffect } from 'react';
import { DeezerTrack, SearchMode } from '../types';
import { DeezerService } from '../services/deezer/deezerService';

// Search configuration
const SEARCH_CONFIG = {
  DEBOUNCE_DELAY: 800, // Debounce delay in milliseconds
} as const;

interface UseSearchResult {
  tracks: DeezerTrack[];
  loading: boolean;
  error: string | null;
  searchMode: SearchMode;
  searchTracks: (query: string, mode?: SearchMode) => Promise<void>;
  setSearchMode: (mode: SearchMode) => void;
  clearResults: () => void;
}

export function useSearch(): UseSearchResult {
  const [tracks, setTracks] = useState<DeezerTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchMode, setSearchMode] = useState<SearchMode>('album'); // Album as default

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

    try {
      console.log(`[${searchId}] Starting ${mode} search for:`, query);
      
      const results = await DeezerService.searchTracks(query, mode);

      // Verify if this is still the most recent search
      if (currentSearchRef.current === searchId) {
        console.log(`[${searchId}] Search completed:`, results.length, 'tracks found');
        setTracks(results);
      } else {
        console.log(`[${searchId}] Search cancelled - newer search in progress`);
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
    
    // Cancel previous debounce timeout if it exists
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // If query is empty, clear results immediately
    if (!query || query.trim().length === 0) {
      setTracks([]);
      setError(null);
      setLoading(false);
      currentSearchRef.current = '';
      return;
    }

    // Implement debounce configuration
    debounceTimeoutRef.current = setTimeout(() => {
      performSearch(query.trim(), currentMode);
    }, SEARCH_CONFIG.DEBOUNCE_DELAY);
  }, [performSearch, searchMode]);

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
    currentSearchRef.current = '';
  }, []);

  return {
    tracks,
    loading,
    error,
    searchMode,
    searchTracks,
    setSearchMode: handleSetSearchMode,
    clearResults,
  };
}