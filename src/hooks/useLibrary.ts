import { useState, useEffect, useCallback } from 'react';
import { SavedMusic } from '../types/music';
import { getSavedMusic, updateMusicRating, deleteMusic } from '../services/musicService';

interface UseLibraryResult {
  savedMusic: SavedMusic[];
  loading: boolean;
  error: string | null;
  refreshing: boolean;
  loadMusic: () => Promise<void>;
  updateRating: (firebaseId: string, rating: number) => Promise<boolean>;
  deleteMusic: (firebaseId: string) => Promise<boolean>;
  refresh: () => void;
  getSavedMusicById: (trackId: string) => SavedMusic | null;
  isMusicSaved: (trackId: string) => boolean;
}

export function useLibrary(): UseLibraryResult {
  const [savedMusic, setSavedMusic] = useState<SavedMusic[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMusic = useCallback(async () => {
    try {
      setError(null);
      const music = await getSavedMusic();
      console.log('🔄 Library loaded:', music.length, 'songs');
      setSavedMusic(music);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar biblioteca';
      setError(errorMessage);
      console.error('Error loading saved music:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const updateRating = useCallback(async (firebaseId: string, rating: number): Promise<boolean> => {
    try {
      await updateMusicRating(firebaseId, rating);
      
      // Refresh from database to ensure consistency
      await loadMusic();
      
      return true;
    } catch (error) {
      console.error('Error updating rating:', error);
      return false;
    }
  }, [loadMusic]);

  const deleteMusicItem = useCallback(async (firebaseId: string): Promise<boolean> => {
    try {
      console.log('🗑️ Deleting music with Firebase ID:', firebaseId);
      await deleteMusic(firebaseId);
      
      console.log('✅ Music deleted from Firebase, refreshing library...');
      // Refresh from database to ensure consistency
      await loadMusic();
      
      return true;
    } catch (error) {
      console.error('Error deleting music:', error);
      return false;
    }
  }, [loadMusic]);

  const refresh = useCallback(() => {
    setRefreshing(true);
    loadMusic();
  }, [loadMusic]);

  // Nova função para buscar música salva por ID
  const getSavedMusicById = useCallback((trackId: string): SavedMusic | null => {
    return savedMusic.find(music => music.id === trackId) || null;
  }, [savedMusic]);

  // Nova função para verificar se uma música está salva
  const isMusicSaved = useCallback((trackId: string): boolean => {
    return savedMusic.some(music => music.id === trackId);
  }, [savedMusic]);

  useEffect(() => {
    loadMusic();
  }, [loadMusic]);

  return {
    savedMusic,
    loading,
    error,
    refreshing,
    loadMusic,
    updateRating,
    deleteMusic: deleteMusicItem,
    refresh,
    getSavedMusicById, // ← Nova função
    isMusicSaved, // ← Nova função
  };
}
