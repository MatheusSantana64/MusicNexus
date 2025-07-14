// src/store/musicStore.ts
// Music store for managing saved music, loading, and operations
import { create } from 'zustand';
import { SavedMusic } from '../types/music';
import { getSavedMusic, updateMusicRating, deleteMusic } from '../services/musicService';

interface OperationState {
  savingTracks: Set<string>;
  savingAlbums: Set<string>;
  updatingRatings: Set<string>;
  deletingMusic: Set<string>;
}

interface MusicState {
  // Core state
  savedMusic: SavedMusic[];
  loading: boolean;
  error: string | null;
  refreshing: boolean;
  lastUpdated: number;
  
  // Operations state - consolidated here
  operations: OperationState;
  
  // Core actions
  loadMusic: () => Promise<void>;
  addMusic: (music: SavedMusic) => void;
  addMusicBatch: (musics: SavedMusic[]) => void;
  updateRating: (firebaseId: string, rating: number) => Promise<boolean>;
  deleteMusic: (firebaseId: string) => Promise<boolean>;
  refresh: () => void;
  clearError: () => void;
  
  // Operation actions - consolidated here
  startTrackSave: (trackId: string) => void;
  finishTrackSave: (trackId: string) => void;
  startAlbumSave: (albumId: string) => void;
  finishAlbumSave: (albumId: string) => void;
  startRatingUpdate: (firebaseId: string) => void;
  finishRatingUpdate: (firebaseId: string) => void;
  startMusicDelete: (firebaseId: string) => void;
  finishMusicDelete: (firebaseId: string) => void;
  
  // Computed/Helper functions
  getSavedMusicById: (trackId: string) => SavedMusic | null;
  isMusicSaved: (trackId: string) => boolean;
  getMusicCount: () => number;
  isTrackSaving: (trackId: string) => boolean;
  isAlbumSaving: (albumId: string) => boolean;
  isRatingUpdating: (firebaseId: string) => boolean;
  isMusicDeleting: (firebaseId: string) => boolean;
  isAnyOperationInProgress: () => boolean;
}

export const useMusicStore = create<MusicState>((set, get) => ({
  // Initial state
  savedMusic: [],
  loading: true,
  error: null,
  refreshing: false,
  lastUpdated: 0,
  operations: {
    savingTracks: new Set(),
    savingAlbums: new Set(),
    updatingRatings: new Set(),
    deletingMusic: new Set(),
  },

  // Core actions
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
      const errorMessage = err instanceof Error ? err.message : 'Error loading library';
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
      console.log('➕ Music added to store:', music.title);
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
      console.log('➕ Batch added to store:', newMusics.length, 'songs');
    }
  },

  updateRating: async (firebaseId: string, rating: number): Promise<boolean> => {
    const { operations, isRatingUpdating } = get();
    
    if (isRatingUpdating(firebaseId)) {
      console.warn('⚠️ Rating update already in progress for:', firebaseId);
      return false;
    }

    try {
      get().startRatingUpdate(firebaseId);

      // 1. Optimistic update
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
      
      // 2. Update database
      await updateMusicRating(firebaseId, rating);
      
      console.log('⭐ Rating updated successfully');
      return true;
    } catch (error) {
      console.error('Error updating rating:', error);
      
      // 3. Rollback on error
      await get().loadMusic();
      return false;
    } finally {
      get().finishRatingUpdate(firebaseId);
    }
  },

  deleteMusic: async (firebaseId: string): Promise<boolean> => {
    const { isMusicDeleting } = get();
    
    if (isMusicDeleting(firebaseId)) {
      console.warn('⚠️ Delete operation already in progress for:', firebaseId);
      return false;
    }

    try {
      get().startMusicDelete(firebaseId);

      // 1. Optimistic removal
      const { savedMusic } = get();
      const filteredMusic = savedMusic.filter(music => music.firebaseId !== firebaseId);
      set({ 
        savedMusic: filteredMusic,
        lastUpdated: Date.now()
      });
      
      // 2. Delete from database
      await deleteMusic(firebaseId);
      
      console.log('✅ Music deleted successfully');
      return true;
    } catch (error) {
      console.error('Error deleting music:', error);
      
      // 3. Rollback on error
      await get().loadMusic();
      return false;
    } finally {
      get().finishMusicDelete(firebaseId);
    }
  },

  refresh: () => {
    set({ refreshing: true });
    get().loadMusic();
  },

  clearError: () => {
    set({ error: null });
  },

  // Operation actions
  startTrackSave: (trackId: string) => {
    const { operations } = get();
    if (!operations.savingTracks.has(trackId)) {
      set({ 
        operations: {
          ...operations,
          savingTracks: new Set(operations.savingTracks).add(trackId)
        }
      });
      console.log('🎵 Started saving track:', trackId);
    }
  },

  finishTrackSave: (trackId: string) => {
    const { operations } = get();
    if (operations.savingTracks.has(trackId)) {
      const newSet = new Set(operations.savingTracks);
      newSet.delete(trackId);
      set({ 
        operations: {
          ...operations,
          savingTracks: newSet
        }
      });
      console.log('✅ Finished saving track:', trackId);
    }
  },

  startAlbumSave: (albumId: string) => {
    const { operations } = get();
    if (!operations.savingAlbums.has(albumId)) {
      set({ 
        operations: {
          ...operations,
          savingAlbums: new Set(operations.savingAlbums).add(albumId)
        }
      });
      console.log('💿 Started saving album:', albumId);
    }
  },

  finishAlbumSave: (albumId: string) => {
    const { operations } = get();
    if (operations.savingAlbums.has(albumId)) {
      const newSet = new Set(operations.savingAlbums);
      newSet.delete(albumId);
      set({ 
        operations: {
          ...operations,
          savingAlbums: newSet
        }
      });
      console.log('✅ Finished saving album:', albumId);
    }
  },

  startRatingUpdate: (firebaseId: string) => {
    const { operations } = get();
    if (!operations.updatingRatings.has(firebaseId)) {
      set({ 
        operations: {
          ...operations,
          updatingRatings: new Set(operations.updatingRatings).add(firebaseId)
        }
      });
      console.log('⭐ Started updating rating:', firebaseId);
    }
  },

  finishRatingUpdate: (firebaseId: string) => {
    const { operations } = get();
    if (operations.updatingRatings.has(firebaseId)) {
      const newSet = new Set(operations.updatingRatings);
      newSet.delete(firebaseId);
      set({ 
        operations: {
          ...operations,
          updatingRatings: newSet
        }
      });
      console.log('✅ Finished updating rating:', firebaseId);
    }
  },

  startMusicDelete: (firebaseId: string) => {
    const { operations } = get();
    if (!operations.deletingMusic.has(firebaseId)) {
      set({ 
        operations: {
          ...operations,
          deletingMusic: new Set(operations.deletingMusic).add(firebaseId)
        }
      });
      console.log('🗑️ Started deleting music:', firebaseId);
    }
  },

  finishMusicDelete: (firebaseId: string) => {
    const { operations } = get();
    if (operations.deletingMusic.has(firebaseId)) {
      const newSet = new Set(operations.deletingMusic);
      newSet.delete(firebaseId);
      set({ 
        operations: {
          ...operations,
          deletingMusic: newSet
        }
      });
      console.log('✅ Finished deleting music:', firebaseId);
    }
  },

  // Helper functions
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

  isTrackSaving: (trackId: string): boolean => {
    const { operations } = get();
    return operations.savingTracks.has(trackId);
  },

  isAlbumSaving: (albumId: string): boolean => {
    const { operations } = get();
    return operations.savingAlbums.has(albumId);
  },

  isRatingUpdating: (firebaseId: string): boolean => {
    const { operations } = get();
    return operations.updatingRatings.has(firebaseId);
  },

  isMusicDeleting: (firebaseId: string): boolean => {
    const { operations } = get();
    return operations.deletingMusic.has(firebaseId);
  },

  isAnyOperationInProgress: (): boolean => {
    const { operations } = get();
    return operations.savingTracks.size > 0 || 
           operations.savingAlbums.size > 0 || 
           operations.updatingRatings.size > 0 || 
           operations.deletingMusic.size > 0;
  },
}));

// Initialize the store
useMusicStore.getState().loadMusic();