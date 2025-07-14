import { create } from 'zustand';
import { SavedMusic } from '../types/music';
import { getSavedMusic, updateMusicRating, deleteMusic } from '../services/musicService';
import { useOperationsStore } from './operationsStore';

interface MusicState {
  // State
  savedMusic: SavedMusic[];
  loading: boolean;
  error: string | null;
  refreshing: boolean;
  lastUpdated: number;
  
  // Actions
  loadMusic: () => Promise<void>;
  addMusic: (music: SavedMusic) => void;
  updateRating: (firebaseId: string, rating: number) => Promise<boolean>;
  deleteMusic: (firebaseId: string) => Promise<boolean>;
  refresh: () => void;
  clearError: () => void;
  
  // Batch operations
  addMusicBatch: (musics: SavedMusic[]) => void;
  
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
  lastUpdated: 0,

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
        error: null,
        lastUpdated: Date.now()
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

  addMusic: (music: SavedMusic) => {
    const { savedMusic } = get();
    const exists = savedMusic.some(m => m.id === music.id);
    
    if (!exists) {
      set({ 
        savedMusic: [...savedMusic, music],
        lastUpdated: Date.now()
      });
      console.log('➕ Music added to local store:', music.title);
    }
  },

  addMusicBatch: (musics: SavedMusic[]) => {
    const { savedMusic } = get();
    const existingIds = new Set(savedMusic.map(m => m.id));
    const newMusics = musics.filter(m => !existingIds.has(m.id));
    
    if (newMusics.length > 0) {
      set({ 
        savedMusic: [...savedMusic, ...newMusics],
        lastUpdated: Date.now()
      });
      console.log('➕ Batch added to local store:', newMusics.length, 'songs');
    }
  },

  updateRating: async (firebaseId: string, rating: number): Promise<boolean> => {
    const operations = useOperationsStore.getState();
    
    // ✨ Check if already updating
    if (operations.isRatingUpdating(firebaseId)) {
      console.warn('⚠️ Rating update already in progress for:', firebaseId);
      return false;
    }

    try {
      // ✨ Start operation tracking
      operations.startRatingUpdate(firebaseId);

      // 1. Optimistically update local state FIRST
      const { savedMusic } = get();
      const updatedMusic = savedMusic.map(music => 
        music.firebaseId === firebaseId 
          ? { ...music, rating }
          : music
      );
      
      set({ 
        savedMusic: updatedMusic,
        lastUpdated: Date.now()
      });
      
      // 2. Then update database
      await updateMusicRating(firebaseId, rating);
      
      console.log('⭐ Rating updated locally and in database');
      return true;
    } catch (error) {
      console.error('Error updating rating:', error);
      
      // 3. Rollback on error by reloading from database
      await get().loadMusic();
      return false;
    } finally {
      // ✨ Always finish operation tracking
      operations.finishRatingUpdate(firebaseId);
    }
  },

  deleteMusic: async (firebaseId: string): Promise<boolean> => {
    const operations = useOperationsStore.getState();
    
    // ✨ Check if already deleting
    if (operations.isMusicDeleting(firebaseId)) {
      console.warn('⚠️ Delete operation already in progress for:', firebaseId);
      return false;
    }

    try {
      // ✨ Start operation tracking
      operations.startMusicDelete(firebaseId);

      console.log('🗑️ Deleting music with Firebase ID:', firebaseId);
      
      // 1. Optimistically remove from local state FIRST
      const { savedMusic } = get();
      const filteredMusic = savedMusic.filter(music => music.firebaseId !== firebaseId);
      set({ 
        savedMusic: filteredMusic,
        lastUpdated: Date.now()
      });
      
      // 2. Then delete from database
      await deleteMusic(firebaseId);
      
      console.log('✅ Music deleted locally and from database');
      return true;
    } catch (error) {
      console.error('Error deleting music:', error);
      
      // 3. Rollback on error by reloading from database
      await get().loadMusic();
      return false;
    } finally {
      // ✨ Always finish operation tracking
      operations.finishMusicDelete(firebaseId);
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