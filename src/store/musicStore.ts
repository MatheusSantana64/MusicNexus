// src/store/musicStore.ts
// Music store for managing saved music, loading, and operations
import { create } from 'zustand';
import { SavedMusic } from '../types/music';
import { 
  getCachedMusic, 
  setCachedMusic, 
  getFirestoreLastModified, 
  fetchMusicFromFirestore 
} from '../services/firestoreCacheService';
import { updateMusicRating, updateMusicRatingAndTags, deleteMusic, SortMode } from '../services/musicService';

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
  currentSortMode: SortMode;
  
  // Operations state - consolidated here
  operations: OperationState;
  
  // Core actions
  loadMusic: (sortMode?: SortMode) => Promise<void>;
  addMusic: (music: SavedMusic) => void;
  addMusicBatch: (musics: SavedMusic[]) => void;
  updateRating: (firebaseId: string, rating: number, tags?: string[]) => Promise<boolean>;
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
  currentSortMode: 'release',
  operations: {
    savingTracks: new Set(),
    savingAlbums: new Set(),
    updatingRatings: new Set(),
    deletingMusic: new Set(),
  },

  // Core actions
  loadMusic: async (sortMode: SortMode = 'release') => {
    try {
      console.log('[musicStore] loadMusic: Triggered with sortMode:', sortMode, '🎶');
      set({ loading: true, error: null });

      // 1. Get cached music and lastModified
      const { music: cachedMusic, lastModified: cachedLastModified } = await getCachedMusic();
      console.log('[musicStore] loadMusic: Cached music count:', cachedMusic.length, 'Cached lastModified:', cachedLastModified, '📦');

      // 2. Get Firestore lastModified
      const firestoreLastModified = await getFirestoreLastModified();
      console.log('[musicStore] loadMusic: Firestore lastModified:', firestoreLastModified, '🔥');

      // 3. Decide whether to use cache or fetch from Firestore
      let useCache = false;
      if (
        firestoreLastModified === null ||
        cachedLastModified === null ||
        typeof cachedLastModified !== 'number'
      ) {
        useCache = false;
        console.log('[musicStore] loadMusic: Cache is NOT valid (missing or invalid lastModified)', '📦⚠️');
      } else if (cachedLastModified >= firestoreLastModified) {
        useCache = true;
        console.log('[musicStore] loadMusic: Cache is up-to-date, using cached music', '📦✅');
      } else {
        console.log('[musicStore] loadMusic: Firestore has newer data, will fetch from Firestore', '🔥⬇️');
      }

      let music: SavedMusic[] = [];
      let lastModified = firestoreLastModified ?? Date.now();

      if (useCache && cachedMusic.length > 0) {
        music = cachedMusic;
        console.log('[musicStore] loadMusic: Loaded music from cache', '📦');
      } else {
        // Fetch from Firestore and update cache
        const result = await fetchMusicFromFirestore();
        music = result.music;
        lastModified = result.lastModified || Date.now();
        await setCachedMusic(music, lastModified);
        console.log('[musicStore] loadMusic: Loaded music from Firestore and updated cache', '🔥⬇️📦');
      }

      set({ 
        savedMusic: music,
        currentSortMode: sortMode,
        loading: false,
        refreshing: false,
        lastUpdated: Date.now()
      });
      console.log('[musicStore] loadMusic: Store updated. Music count:', music.length, 'Last updated:', new Date().toISOString(), '🎶✅');
    } catch (error) {
      console.error('[musicStore] loadMusic: Error loading music:', error, '🎶❌');
      set({ 
        error: error instanceof Error ? error.message : 'Failed to load music',
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
      console.log('[musicStore] Music added to store:', music.title, '➕🎶');
      console.log('[musicStore] Total music count:', savedMusic.length + 1, '📊');
    } else {
      console.log('[musicStore] Music already exists in store:', music.title, '⚠️');
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
      console.log('[musicStore] Batch added to store:', newMusics.length, 'songs', '➕🎶');
    }
  },

  updateRating: async (firebaseId: string, rating: number, tags?: string[]): Promise<boolean> => {
    const { operations, isRatingUpdating } = get();

    if (isRatingUpdating(firebaseId)) {
      console.warn('[musicStore] Rating update already in progress for:', firebaseId, '⚠️');
      return false;
    }

    try {
      get().startRatingUpdate(firebaseId);

      // 1. Optimistic update
      const { savedMusic } = get();
      const updatedMusic = savedMusic.map(music =>
        music.firebaseId === firebaseId
          ? { ...music, rating, tags: tags ?? music.tags }
          : music
      );

      set({
        savedMusic: updatedMusic,
        lastUpdated: Date.now()
      });

      // 2. Update database
      if (tags) {
        await updateMusicRatingAndTags(firebaseId, rating, tags);
      } else {
        await updateMusicRating(firebaseId, rating);
      }

      console.log('[musicStore] Rating/tags updated successfully', '⭐✅');
      return true;
    } catch (error) {
      console.error('[musicStore] Error updating rating/tags:', error, '⭐❌');

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
      console.warn('[musicStore] Delete operation already in progress for:', firebaseId, '⚠️');
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
      
      console.log('[musicStore] Music deleted successfully', '🗑️✅');
      return true;
    } catch (error) {
      console.error('[musicStore] Error deleting music:', error, '🗑️❌');
      
      // 3. Rollback on error
      await get().loadMusic();
      return false;
    } finally {
      get().finishMusicDelete(firebaseId);
    }
  },

  refresh: (sortMode?: SortMode) => {
    const currentSort = sortMode || get().currentSortMode;
    set({ refreshing: true });
    get().loadMusic(currentSort);
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
      console.log('[musicStore] Started saving track:', trackId, '🎵');
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
      console.log('[musicStore] Finished saving track:', trackId, '🎵✅');
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
      console.log('[musicStore] Started saving album:', albumId, '💿');
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
      console.log('[musicStore] Finished saving album:', albumId, '💿✅');
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
      console.log('[musicStore] Started updating rating:', firebaseId, '⭐');
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
      console.log('[musicStore] Finished updating rating:', firebaseId, '⭐✅');
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
      console.log('[musicStore] Started deleting music:', firebaseId, '🗑️');
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
      console.log('[musicStore] Finished deleting music:', firebaseId, '🗑️✅');
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