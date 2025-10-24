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
import { deleteMusic, SortMode } from '../services/music/musicService';
import { doc, updateDoc, addDoc, collection, setDoc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

const DELETED_MUSIC_IDS_KEY = 'deletedMusicIds';

// Helper to get/set deleted IDs
async function getDeletedMusicIds(): Promise<string[]> {
  const json = await AsyncStorage.getItem(DELETED_MUSIC_IDS_KEY);
  return json ? JSON.parse(json) : [];
}
async function setDeletedMusicIds(ids: string[]): Promise<void> {
  await AsyncStorage.setItem(DELETED_MUSIC_IDS_KEY, JSON.stringify(ids));
}

// --- SYNC LOGIC ---
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
        return;
      }

      // Load cached and remote data
      const { music: cachedMusic, lastModified: cachedLastModified } = await getCachedMusic();
      const { music: remoteMusicArray } = await fetchMusicFromFirestore();
      const remoteById = new Map<string, SavedMusic>();
      remoteMusicArray.forEach(m => { if (m.firebaseId) remoteById.set(m.firebaseId, m); });

      // Sync deleted IDs first (existing behavior)
      const deletedIds = await getDeletedMusicIds();
      if (deletedIds.length > 0) {
        const { db } = require('../config/firebaseConfig');
        const { doc: fDoc, deleteDoc } = require('firebase/firestore');
        for (const id of deletedIds) {
          try {
            await deleteDoc(fDoc(db, 'savedMusic', id));
          } catch (err) {
            console.warn('[musicStore] Failed to delete music from Firestore during sync:', id, err);
          }
        }
        await setDeletedMusicIds([]); // Clear after syncing
      }

      // Helper: determine a numeric lastModified for a SavedMusic
      const getLastModified = (m?: SavedMusic): number => {
        if (!m) return 0;
        // ratingHistory latest timestamp (ISO string)
        const hist = m.ratingHistory ?? [];
        if (hist.length > 0) {
          const last = hist[hist.length - 1].timestamp;
          const t = Date.parse(last);
          if (!Number.isNaN(t)) return t;
        }
        if (m['lastModified'] && typeof m['lastModified'] === 'number') {
          return m['lastModified'];
        }
        if (m.savedAt instanceof Date) return m.savedAt.getTime();
        return 0;
      };

      // Build local map by firebaseId when present, otherwise keep local-only list
      const localById = new Map<string, SavedMusic>();
      const localNoId: SavedMusic[] = [];
      for (const lm of cachedMusic) {
        if (lm.firebaseId) localById.set(lm.firebaseId, lm);
        else localNoId.push(lm);
      }

      // Merge per-document
      const mergedMap = new Map<string, SavedMusic>();

      // 1) handle documents present remotely (remote wins when newer)
      for (const [fid, remote] of remoteById.entries()) {
        const local = localById.get(fid);
        if (!local) {
          // remote-only, keep remote
          mergedMap.set(fid, remote);
          continue;
        }

        const localLM = getLastModified(local);
        const remoteLM = getLastModified(remote);

        // Merge ratingHistory (union by timestamp), tags (union), and prefer latest values by lastModified
        const mergeHistories = (a: (RatingHistoryEntry[]|undefined), b: (RatingHistoryEntry[]|undefined)) => {
          const combined = [...(a ?? []), ...(b ?? [])];
          const unique = new Map<string, RatingHistoryEntry>();
          combined.forEach(h => {
            if (h.timestamp) unique.set(h.timestamp + '|' + h.rating, h);
          });
          return Array.from(unique.values()).sort((x, y) => Date.parse(x.timestamp) - Date.parse(y.timestamp));
        };

        const mergedHistory = mergeHistories(local.ratingHistory, remote.ratingHistory);
        const mergedTags = Array.from(new Set([...(local.tags ?? []), ...(remote.tags ?? [])]));

        // Choose base: remote if remote newer, else local
        const base = remoteLM >= localLM ? remote : local;
        const merged: SavedMusic = {
          ...base,
          // merge fields
          tags: mergedTags,
          ratingHistory: mergedHistory,
          // rating = last history rating if available, else base.rating
          rating: (mergedHistory.length > 0 ? mergedHistory[mergedHistory.length - 1].rating : base.rating),
          // savedAt choose earliest (preserve original saved date)
          savedAt: new Date(Math.min((local.savedAt?.getTime?.() ?? Infinity), (remote.savedAt?.getTime?.() ?? Infinity)) || Date.now()),
        };
        mergedMap.set(fid, merged);

        // If local is newer, ensure remote gets updated (push after building merged set)
        // We'll collect later by comparing timestamps
      }

      // 2) handle local-only items with firebaseId that are not in remote (e.g. created locally and pushed earlier)
      for (const [fid, local] of localById.entries()) {
        if (!remoteById.has(fid)) {
          mergedMap.set(fid, local);
        }
      }

      // 3) add remote-only items already covered; now add local-only (no firebaseId) items
      // localNoId should be preserved and attempted to push to Firestore
      // merged list will temporarily include them without firebaseId
      for (const l of localNoId) {
        mergedMap.set(`local-${l.id}`, l); // key is temporary: will normalize after push
      }

      // Convert mergedMap to array
      let mergedList = Array.from(mergedMap.values());

      // 4) Push local-only (no firebaseId) items to Firestore and update their firebaseId in mergedList
      const { db } = require('../config/firebaseConfig');
      const toAdd = mergedList.filter(m => !m.firebaseId);
      if (toAdd.length > 0) {
        for (const item of toAdd) {
          try {
            // prepare payload (omit firebaseId, ensure dates -> ISO or Firestore compatible)
            const { firebaseId, savedAt, ratingHistory, ...payload } = item as any;
            const payloadToSave = {
              ...payload,
              savedAt: savedAt instanceof Date ? savedAt : new Date(),
              ratingHistory: ratingHistory ?? [],
            };
            const docRef = await addDoc(collection(db, 'savedMusic'), payloadToSave);
            // update local item firebaseId in mergedList and cachedMusic
            mergedList = mergedList.map(m => m === item ? { ...m, firebaseId: docRef.id } : m);
          } catch (err) {
            console.warn('[musicStore] syncMusicWithFirestore: Failed to add local-only item to Firestore:', item.id, err);
            // leave local item as-is; it remains in cache and _dirty so it will be retried
          }
        }
      }

      // 5) For items where local was newer than remote, push merged local to Firestore (setDoc)
      let pushedAny = false;
      for (const merged of mergedList) {
        if (!merged.firebaseId) continue;
        const fid = merged.firebaseId;
        const local = cachedMusic.find(m => m.firebaseId === fid);
        const remote = remoteById.get(fid);
        const localLM = getLastModified(local);
        const remoteLM = getLastModified(remote);
        if (local && localLM > remoteLM) {
          try {
            const { firebaseId, ...payload } = merged as any;
            await setDoc(doc(db, 'savedMusic', fid), { ...payload }, { merge: true });
            pushedAny = true;
          } catch (err) {
            console.warn('[musicStore] syncMusicWithFirestore: Failed to setDoc for', fid, err);
          }
        }
      }

      // 6) Save mergedList to cache and state
      const now = Date.now();
      await setCachedMusic(mergedList, now);
      set({ savedMusic: mergedList, lastUpdated: now, _dirty: false });

      // 7) If we pushed changes, update the global meta
      if (pushedAny) {
        try {
          await setSavedMusicMeta();
        } catch (err) {
          console.warn('[musicStore] syncMusicWithFirestore: Failed to update meta', err);
        }
      }
    } catch (err) {
      console.error('[musicStore] syncMusicWithFirestore: Sync failed', err);
    }
  },
  loadMusic: async (sortMode: SortMode = 'release') => {
    try {
      set({ loading: true, error: null });

      // 1. Get cached music and lastModified
      const { music: cachedMusic, lastModified: cachedLastModified } = await getCachedMusic();

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
        return;
      }

      // 3. Get Firestore lastModified
      const firestoreLastModified = await getFirestoreLastModified();

      // 4. Decide whether to use cache or fetch from Firestore
      // If we have unsynced local changes, prefer the cache to avoid overwriting offline edits.
      const dirty = (get() as any)._dirty === true;
      let useCache = false;
      if (dirty) {
        useCache = true;
      } else {
        if (
          firestoreLastModified === null ||
          cachedLastModified === null ||
          typeof cachedLastModified !== 'number'
        ) {
          useCache = false;
        } else if (cachedLastModified >= firestoreLastModified) {
          useCache = true;
        }
      }

      let music: SavedMusic[] = [];
      let lastModified = firestoreLastModified ?? Date.now();

      if (useCache && cachedMusic.length > 0) {
        music = cachedMusic;
      } else {
        // Fetch from Firestore and update cache
        const result = await fetchMusicFromFirestore();
        music = result.music;
        lastModified = result.lastModified || Date.now();
        await setCachedMusic(music, lastModified);
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
      (get() as any).syncMusicWithFirestore();
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
      let newRatingHistory: RatingHistoryEntry[] = [];
      let prevRating: number | undefined;
      const updatedMusic = savedMusic.map(music => {
        if (music.firebaseId === firebaseId) {
          prevRating = music.rating;
          // Only append to history if rating actually changed
          if (music.rating !== rating) {
            newRatingHistory = [
              ...(music.ratingHistory || []),
              { rating, timestamp: now }
            ];
          } else {
            newRatingHistory = music.ratingHistory || [];
          }
          return { ...music, rating, tags: tags ?? music.tags, ratingHistory: newRatingHistory };
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

      // 2. Update Firestore immediately if online
      const state = await NetInfo.fetch();
      if (state.isConnected) {
        const updateObj: any = { rating, tags: tags ?? [] };
        if (prevRating !== undefined && prevRating !== rating) {
          updateObj.ratingHistory = newRatingHistory;
        }
        await updateDoc(
          doc(require('../config/firebaseConfig').db, 'savedMusic', firebaseId),
          updateObj
        );
        await setSavedMusicMeta();
      }

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

      // 🔥 Actually delete from Firestore if online, else track for later
      const state = await NetInfo.fetch();
      if (state.isConnected) {
        await deleteMusic(firebaseId);
      } else {
        const deletedIds = await getDeletedMusicIds();
        if (!deletedIds.includes(firebaseId)) {
          deletedIds.push(firebaseId);
          await setDeletedMusicIds(deletedIds);
        }
      }
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