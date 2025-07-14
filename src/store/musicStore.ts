import { create } from 'zustand';
import { SavedMusic } from '../types/music';
import { getSavedMusic, updateMusicRating, deleteMusic } from '../services/musicService';

interface MusicState {
  // State
  savedMusic: SavedMusic[];
  loading: boolean;
  error: string | null;
  refreshing: boolean;
  
  // Actions
  loadMusic: () => Promise<void>;
  updateRating: (firebaseId: string, rating: number) => Promise<boolean>;
  deleteMusic: (firebaseId: string) => Promise<boolean>;
  refresh: () => void;
  clearError: () => void;
  
  // Computed/Helper functions
  getSavedMusicById: (trackId: string) => SavedMusic | null;
  isMusicSaved: (trackId: string) => boolean;
  getMusicCount: () => number;
}

export const useMusicStore = create<MusicState>((set, get) => ({
  // Initial state
  savedMusic: [],
  loading: true,
  error: null,
  refreshing: false,

  // Actions
  loadMusic: async () => {
    const state = get();
    
    try {
      set({ error: null, loading: !state.refreshing });
      
      const music = await getSavedMusic();
      console.log('🔄 Music store loaded:', music.length, 'songs');
      
      set({ 
        savedMusic: music, 
        loading: false, 
        refreshing: false,
        error: null 
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar biblioteca';
      console.error('Error loading saved music:', err);
      
      set({ 
        error: errorMessage, 
        loading: false, 
        refreshing: false 
      });
    }
  },

  updateRating: async (firebaseId: string, rating: number): Promise<boolean> => {
    try {
      await updateMusicRating(firebaseId, rating);
      
      // Optimistically update the local state
      const { savedMusic } = get();
      const updatedMusic = savedMusic.map(music => 
        music.firebaseId === firebaseId 
          ? { ...music, rating }
          : music
      );
      
      set({ savedMusic: updatedMusic });
      
      // Refresh from database to ensure consistency
      await get().loadMusic();
      
      return true;
    } catch (error) {
      console.error('Error updating rating:', error);
      return false;
    }
  },

  deleteMusic: async (firebaseId: string): Promise<boolean> => {
    try {
      console.log('🗑️ Deleting music with Firebase ID:', firebaseId);
      
      // Optimistically remove from local state
      const { savedMusic } = get();
      const filteredMusic = savedMusic.filter(music => music.firebaseId !== firebaseId);
      set({ savedMusic: filteredMusic });
      
      await deleteMusic(firebaseId);
      
      console.log('✅ Music deleted from Firebase, refreshing store...');
      
      // Refresh from database to ensure consistency
      await get().loadMusic();
      
      return true;
    } catch (error) {
      console.error('Error deleting music:', error);
      
      // Rollback optimistic update on error
      await get().loadMusic();
      
      return false;
    }
  },

  refresh: () => {
    set({ refreshing: true });
    get().loadMusic();
  },

  clearError: () => {
    set({ error: null });
  },

  // Computed/Helper functions
  getSavedMusicById: (trackId: string): SavedMusic | null => {
    const { savedMusic } = get();
    return savedMusic.find(music => music.id === trackId) || null;
  },

  isMusicSaved: (trackId: string): boolean => {
    const { savedMusic } = get();
    return savedMusic.some(music => music.id === trackId);
  },

  getMusicCount: (): number => {
    const { savedMusic } = get();
    return savedMusic.length;
  },
}));

// Initialize the store
useMusicStore.getState().loadMusic();