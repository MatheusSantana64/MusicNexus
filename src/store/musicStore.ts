// src/store/musicStore.ts
// Music store for managing saved music, loading, and operations
import { create } from 'zustand';
import { SavedMusic, RatingHistoryEntry } from '../types';
import { 
  getCachedMusic, 
  setCachedMusic, 
  getFirestoreLastModified, 
  fetchMusicFromFirestore 
} from '../services/firestoreCacheService';
import { setSavedMusicMeta } from '../services/firestoreMetaHelper';
import NetInfo from '@react-native-community/netinfo';
import { updateMusicRating, updateMusicRatingAndTags, deleteMusic, SortMode } from '../services/musicService';
import { doc, updateDoc } from 'firebase/firestore';

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

  updateRatingHistory: (firebaseId: string, entryIdx: number) => Promise<void>;
}

export const useMusicStore = create<MusicState & { _dirty?: boolean; syncMusicWithFirestore?: () => Promise<void> }>((set, get) => ({
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

  // --- OFFLINE SYNC STATE ---
  _dirty: false, // not exposed in MusicState, internal only

  // --- SYNC LOGIC ---
  syncMusicWithFirestore: async () => {
    try {
      const state = await NetInfo.fetch();
      if (!state.isConnected) {
        console.log('[musicStore] syncMusicWithFirestore: Offline, skipping sync');
        return;
      }
      const { music: cachedMusic, lastModified: cachedLastModified } = await getCachedMusic();
      const firestoreLastModified = await getFirestoreLastModified();
      if (
        typeof cachedLastModified === 'number' &&
        (firestoreLastModified === null || cachedLastModified > firestoreLastModified)
      ) {
        // Push local cache to Firestore
        console.log('[musicStore] syncMusicWithFirestore: Local cache is newer, pushing to Firestore');
        const { db } = require('../config/firebaseConfig');
        const { doc, setDoc } = require('firebase/firestore');
        for (const music of cachedMusic) {
          if (!music.firebaseId) continue;
          const docRef = doc(db, 'savedMusic', music.firebaseId);
          const { firebaseId, ...musicData } = music;
          await setDoc(docRef, musicData, { merge: true });
        }
        await setSavedMusicMeta(cachedLastModified);
        set({ _dirty: false });
        console.log('[musicStore] syncMusicWithFirestore: Sync complete');
      } else {
        console.log('[musicStore] syncMusicWithFirestore: No sync needed');
      }
    } catch (err) {
      console.error('[musicStore] syncMusicWithFirestore: Sync failed', err);
    }
  },
  loadMusic: async (sortMode: SortMode = 'release') => {
    try {
      console.log('[musicStore] loadMusic: Triggered with sortMode:', sortMode, '🎶');
      set({ loading: true, error: null });

      // 1. Get cached music and lastModified
      const { music: cachedMusic, lastModified: cachedLastModified } = await getCachedMusic();
      console.log('[musicStore] loadMusic: Cached music count:', cachedMusic.length, 'Cached lastModified:', cachedLastModified, '📦');

      // 2. Check network status
      const state = await NetInfo.fetch();
      if (!state.isConnected) {
        // Offline: use cache immediately if available
        set({
          savedMusic: cachedMusic,
          currentSortMode: sortMode,
          loading: false,
          refreshing: false,
          lastUpdated: Date.now()
        });
        console.log('[musicStore] loadMusic: Offline, loaded from cache', '📦🚫🌐');
        return;
      }

      // 3. Get Firestore lastModified
      const firestoreLastModified = await getFirestoreLastModified();
      console.log('[musicStore] loadMusic: Firestore lastModified:', firestoreLastModified, '🔥');

      // 4. Decide whether to use cache or fetch from Firestore
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
      // After loading, try to sync if needed
      (get() as any).syncMusicWithFirestore();
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
      const newMusic = [...savedMusic, music];
      const newLastModified = Date.now();
      set({ 
        savedMusic: newMusic,
        lastUpdated: newLastModified,
        _dirty: true
      });
      setCachedMusic(newMusic, newLastModified);
      console.log('[musicStore] Music added to store:', music.title, '➕🎶');
      console.log('[musicStore] Total music count:', savedMusic.length + 1, '📊');
      (get() as any).syncMusicWithFirestore();
    } else {
      console.log('[musicStore] Music already exists in store:', music.title, '⚠️');
    }
  },

  addMusicBatch: (musics: SavedMusic[]) => {
    const { savedMusic } = get();
    const existingIds = new Set(savedMusic.map(m => m.id));
    const newMusics = musics.filter(m => !existingIds.has(m.id));
    if (newMusics.length > 0) {
      const updatedMusic = [...savedMusic, ...newMusics];
      const newLastModified = Date.now();
      set({ 
        savedMusic: updatedMusic,
        lastUpdated: newLastModified,
        _dirty: true
      });
      setCachedMusic(updatedMusic, newLastModified);
      console.log('[musicStore] Batch added to store:', newMusics.length, 'songs', '➕🎶');
      (get() as any).syncMusicWithFirestore();
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
      const now = new Date().toISOString();
      const updatedMusic = savedMusic.map(music => {
        if (music.firebaseId === firebaseId) {
          const newHistory: RatingHistoryEntry[] = [
            ...(music.ratingHistory || []),
            { rating, timestamp: now }
          ];
          return { ...music, rating, tags: tags ?? music.tags, ratingHistory: newHistory };
        }
        return music;
      });
      const newLastModified = Date.now();
      set({
        savedMusic: updatedMusic,
        lastUpdated: newLastModified,
        _dirty: true
      });
      setCachedMusic(updatedMusic, newLastModified);
      (get() as any).syncMusicWithFirestore();
      console.log('[musicStore] Rating/tags updated successfully, history appended', '⭐✅');
      return true;
    } catch (error) {
      console.error('[musicStore] Error updating rating/tags:', error, '⭐❌');
      return false;
    } finally {
      get().finishRatingUpdate(firebaseId);
    }
  },

  deleteMusic: async (firebaseId: string): Promise<boolean> => {
    const { isMusicDeleting, savedMusic } = get();
    if (isMusicDeleting(firebaseId)) {
      console.warn('[musicStore] Delete already in progress for:', firebaseId, '⚠️');
      return false;
    }
    try {
      get().startMusicDelete(firebaseId);
      // Optimistic update: remove from local state and cache
      const updatedMusic = savedMusic.filter(music => music.firebaseId !== firebaseId);
      const newLastModified = Date.now();
      set({
        savedMusic: updatedMusic,
        lastUpdated: newLastModified,
        _dirty: true
      });
      setCachedMusic(updatedMusic, newLastModified);
      (get() as any).syncMusicWithFirestore();
      console.log('[musicStore] Music deleted locally:', firebaseId, '🗑️');
      // 🔥 Actually delete from Firestore
      await deleteMusic(firebaseId);
      return true;
    } catch (error) {
      console.error('[musicStore] Error deleting music:', error, '🗑️❌');
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

  updateRatingHistory: async (firebaseId: string, entryIdx: number) => {
    const { savedMusic } = get();
    const updatedMusic = savedMusic.map(music => {
      if (music.firebaseId === firebaseId && music.ratingHistory) {
        const newHistory = music.ratingHistory.filter((_, idx) => idx !== entryIdx);
        return { ...music, ratingHistory: newHistory };
      }
      return music;
    });
    set({ savedMusic: updatedMusic, _dirty: true });
    setCachedMusic(updatedMusic, Date.now());

    // Update Firestore
    try {
      const music = updatedMusic.find(m => m.firebaseId === firebaseId);
      if (music) {
        const docRef = doc(require('../config/firebaseConfig').db, 'savedMusic', firebaseId);
        await updateDoc(docRef, { ratingHistory: music.ratingHistory ?? [] });
        await setSavedMusicMeta();
      }
    } catch (err) {
      console.error('[musicStore] Failed to update ratingHistory in Firestore:', err);
    }

    (get() as any).syncMusicWithFirestore();
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