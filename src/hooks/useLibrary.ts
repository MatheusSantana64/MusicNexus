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
      
      // Atualizar localmente
      setSavedMusic(prev => prev.map(music => 
        music.firebaseId === firebaseId 
          ? { ...music, rating }
          : music
      ));
      
      return true;
    } catch (error) {
      console.error('Error updating rating:', error);
      return false;
    }
  }, []);

  const deleteMusicItem = useCallback(async (firebaseId: string): Promise<boolean> => {
    try {
      await deleteMusic(firebaseId);
      
      // Remover localmente
      setSavedMusic(prev => prev.filter(music => music.firebaseId !== firebaseId));
      
      return true;
    } catch (error) {
      console.error('Error deleting music:', error);
      return false;
    }
  }, []);

  const refresh = useCallback(() => {
    setRefreshing(true);
    loadMusic();
  }, [loadMusic]);

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
  };
}
