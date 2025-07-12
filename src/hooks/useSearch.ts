import { useState, useCallback, useRef, useEffect } from 'react';
import { DeezerTrack, SearchMode } from '../types/music';
import { DeezerService } from '../services/deezerService';

// Configurações de busca
const SEARCH_CONFIG = {
  DEBOUNCE_DELAY: 800, // Tempo de espera após parar de digitar (em ms)
  MIN_QUERY_LENGTH: 3, // Tamanho mínimo da query para buscar
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
  const [searchMode, setSearchMode] = useState<SearchMode>('album'); // Álbum como padrão

  // Refs para controlar debounce e cancelamento
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

  // Função interna para fazer a busca real
  const performSearch = useCallback(async (query: string, mode: SearchMode) => {
    // Cancelar requisição anterior se existir
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Criar novo AbortController para esta busca
    abortControllerRef.current = new AbortController();
    const searchId = Math.random().toString(36).substr(2, 9);
    currentSearchRef.current = searchId;

    setLoading(true);
    setError(null);

    try {
      console.log(`[${searchId}] Starting ${mode} search for:`, query);
      
      const results = await DeezerService.searchTracks(query, mode);
      
      // Verificar se esta ainda é a busca mais recente
      if (currentSearchRef.current === searchId) {
        console.log(`[${searchId}] Search completed:`, results.length, 'tracks found');
        setTracks(results);
      } else {
        console.log(`[${searchId}] Search cancelled - newer search in progress`);
      }
    } catch (err: unknown) {
      // Verificar se esta ainda é a busca mais recente e não foi cancelada
      if (currentSearchRef.current === searchId) {
        // Type guard para verificar se é um erro de abort
        const isAbortError = err instanceof Error && err.name === 'AbortError';
        
        if (!isAbortError) {
          const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
          setError(errorMessage);
          setTracks([]);
          console.error(`[${searchId}] Search error:`, err);
        }
      }
    } finally {
      // Só parar o loading se esta for a busca mais recente
      if (currentSearchRef.current === searchId) {
        setLoading(false);
      }
    }
  }, []);

  const searchTracks = useCallback(async (query: string, mode?: SearchMode) => {
    const currentMode = mode || searchMode;
    
    // Limpar timeout anterior
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Se query estiver vazia, limpar resultados imediatamente
    if (!query || query.trim().length === 0) {
      setTracks([]);
      setError(null);
      setLoading(false);
      currentSearchRef.current = '';
      return;
    }

    // Se query for muito curta, não buscar
    if (query.trim().length < SEARCH_CONFIG.MIN_QUERY_LENGTH) {
      setTracks([]);
      setError(null);
      setLoading(false);
      return;
    }

    // Implementar debounce configurável
    debounceTimeoutRef.current = setTimeout(() => {
      performSearch(query.trim(), currentMode);
    }, SEARCH_CONFIG.DEBOUNCE_DELAY);
  }, [performSearch, searchMode]);

  const handleSetSearchMode = useCallback((mode: SearchMode) => {
    setSearchMode(mode);
  }, []);

  const clearResults = useCallback(() => {
    // Cancelar timeout de debounce
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    // Cancelar requisição em andamento
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Limpar estado
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