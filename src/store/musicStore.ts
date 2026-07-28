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
import { syncTrackToConfiguredTidalPlaylist, addTrackToConfiguredPlaylist, removeTrackFromConfiguredPlaylist } from '../services/tidal/tidalAccountService';
import { showToast } from '../utils/toast';
import { doc, updateDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTagStore } from './tagStore';

// ===== TYPES =====
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
  
  // Operations state
  operations: OperationState;
  tidalSyncingIds: Set<string>;
  isOnline: boolean;
  
  // Core actions
  loadMusic: (sortMode?: SortMode) => Promise<void>;
  addMusic: (music: SavedMusic) => void;
  addMusicBatch: (musics: SavedMusic[]) => void;
  updateRating: (firebaseId: string, rating: number, tags?: string[]) => Promise<boolean>;
  updateSong: (firebaseId: string, updates: Partial<SavedMusic>) => Promise<boolean>;
  deleteMusic: (firebaseId: string) => Promise<boolean>;
  refresh: (sortMode?: SortMode) => void;
  clearError: () => void;
  
  // Operation actions
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
  startTidalSync: (trackId: string) => void;
  finishTidalSync: (trackId: string) => void;
  isTidalSyncing: (trackId: string) => boolean;
  updateRatingHistory: (firebaseId: string, entryIdx: number, newRating?: number) => Promise<void>;
}

// 🔥 Internal state (not exposed in MusicState)
interface InternalMusicState extends MusicState {
  _dirty: boolean;
  syncMusicWithFirestore: () => Promise<void>;
  drainTidalSyncQueue: () => Promise<void>;
}

// ===== ASYNC STORAGE KEYS =====
const STORAGE_KEYS = {
  DELETED_MUSIC_IDS: 'deletedMusicIds',
  DIRTY_FLAG: 'musicStoreDirty',
  DIRTY_MUSIC_IDS: 'dirtyMusicIds',
  TIDAL_SYNC_QUEUE: 'tidalSyncQueue',
} as const;

// ===== ASYNC STORAGE HELPERS =====
let tidalDrainInProgress = false;
async function getDeletedMusicIds(): Promise<string[]> {
  const json = await AsyncStorage.getItem(STORAGE_KEYS.DELETED_MUSIC_IDS);
  return json ? JSON.parse(json) : [];
}

async function setDeletedMusicIds(ids: string[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.DELETED_MUSIC_IDS, JSON.stringify(ids));
}

async function getDirtyFlag(): Promise<boolean> {
  const val = await AsyncStorage.getItem(STORAGE_KEYS.DIRTY_FLAG);
  return val === 'true';
}

async function setDirtyFlag(dirty: boolean): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.DIRTY_FLAG, String(dirty));
}

async function getDirtyMusicIds(): Promise<Set<string>> {
  const json = await AsyncStorage.getItem(STORAGE_KEYS.DIRTY_MUSIC_IDS);
  return json ? new Set(JSON.parse(json)) : new Set();
}

async function setDirtyMusicIds(ids: Set<string>): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.DIRTY_MUSIC_IDS, JSON.stringify([...ids]));
}

async function addDirtyMusicId(firebaseId: string): Promise<void> {
  const dirtyIds = await getDirtyMusicIds();
  dirtyIds.add(firebaseId);
  await setDirtyMusicIds(dirtyIds);
}

async function clearDirtyMusicIds(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEYS.DIRTY_MUSIC_IDS);
}

async function removeDirtyMusicId(firebaseId: string): Promise<void> {
  const dirtyIds = await getDirtyMusicIds();
  dirtyIds.delete(firebaseId);
  await setDirtyMusicIds(dirtyIds);
}

interface TidalSyncQueueItem {
  trackId: string;
  trackName: string;
  rating: number;
  previousRating?: number;
  firebaseId: string;
}

async function getTidalSyncQueue(): Promise<TidalSyncQueueItem[]> {
  const json = await AsyncStorage.getItem(STORAGE_KEYS.TIDAL_SYNC_QUEUE);
  return json ? JSON.parse(json) : [];
}

async function setTidalSyncQueue(items: TidalSyncQueueItem[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.TIDAL_SYNC_QUEUE, JSON.stringify(items));
}

async function enqueueTidalSync(item: TidalSyncQueueItem): Promise<void> {
  const queue = await getTidalSyncQueue();
  const existing = queue.findIndex(q => q.firebaseId === item.firebaseId);
  if (existing >= 0) {
    queue[existing] = item;
  } else {
    queue.push(item);
  }
  await setTidalSyncQueue(queue);
}

async function removeFromTidalSyncQueue(firebaseId: string): Promise<void> {
  const queue = await getTidalSyncQueue();
  const updated = queue.filter(item => item.firebaseId !== firebaseId);
  if (updated.length === queue.length) return;
  if (updated.length === 0) {
    await AsyncStorage.removeItem(STORAGE_KEYS.TIDAL_SYNC_QUEUE);
  } else {
    await setTidalSyncQueue(updated);
  }
}

async function clearTidalSyncQueue(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEYS.TIDAL_SYNC_QUEUE);
}

// ===== SYNC HELPERS =====
async function syncDeletedMusic(): Promise<void> {
  const deletedIds = await getDeletedMusicIds();
  if (deletedIds.length === 0) return;

  for (const id of deletedIds) {
    try {
      await deleteDoc(doc(db, 'savedMusic', id));
    } catch (err) {
      console.warn('[musicStore] Failed to delete music from Firestore:', id, err);
    }
  }
  await setDeletedMusicIds([]);
}

async function syncDirtyMusic(cachedMusic: SavedMusic[]): Promise<boolean> {
  const dirtyMusicIds = await getDirtyMusicIds();
  if (dirtyMusicIds.size === 0) return false;

  const musicToPush = cachedMusic.filter(m => m.firebaseId && dirtyMusicIds.has(m.firebaseId));
  
  if (musicToPush.length === 0) {
    console.warn('[musicStore] No dirty music found in cache');
    await clearDirtyMusicIds();
    return false;
  }
  
  console.log(`[musicStore] Syncing ${musicToPush.length} dirty tracks to Firestore...`);
  
  for (const music of musicToPush) {
    if (!music.firebaseId) continue;
    const docRef = doc(db, 'savedMusic', music.firebaseId);
    const { firebaseId, ...musicData } = music;
    await setDoc(docRef, musicData, { merge: true });
  }
  
  await clearDirtyMusicIds();
  return true;
}

async function syncTagTidalPlaylists(
  trackId: string,
  oldTags: string[],
  newTags: string[]
): Promise<void> {
  const addedTags = newTags.filter(t => !oldTags.includes(t));
  const removedTags = oldTags.filter(t => !newTags.includes(t));
  if (addedTags.length === 0 && removedTags.length === 0) return;

  const allTags = useTagStore.getState().tags;

  for (const tagId of addedTags) {
    const tag = allTags.find(t => t.id === tagId);
    if (tag?.tidalPlaylistId) {
      try {
        await addTrackToConfiguredPlaylist(tag.tidalPlaylistId, trackId);
      } catch (err) {
        console.error('[musicStore] Failed to add track to tag playlist:', tagId, err);
      }
    }
  }

  for (const tagId of removedTags) {
    const tag = allTags.find(t => t.id === tagId);
    if (tag?.tidalPlaylistId) {
      try {
        await removeTrackFromConfiguredPlaylist(tag.tidalPlaylistId, trackId);
      } catch (err) {
        console.error('[musicStore] Failed to remove track from tag playlist:', tagId, err);
      }
    }
  }
}

// ===== ZUSTAND STORE =====
export const useMusicStore = create<InternalMusicState>((set, get) => ({
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
  _dirty: false,
  tidalSyncingIds: new Set<string>(),
  isOnline: true,

  // ===== SYNC LOGIC =====
  syncMusicWithFirestore: async () => {
    try {
      const state = await NetInfo.fetch();
      if (!state.isConnected) return;
      
      const { music: cachedMusic } = await getCachedMusic();

      // Sync deletions first
      await syncDeletedMusic();

      // Sync dirty music
      const hadDirtyMusic = await syncDirtyMusic(cachedMusic);
      
      if (hadDirtyMusic) {
        const newLastModified = Date.now();
        await setSavedMusicMeta(newLastModified);
        await setCachedMusic(cachedMusic, newLastModified);
        set({ _dirty: false, lastUpdated: newLastModified });
        await setDirtyFlag(false);
      } else {
        set({ _dirty: false });
        await setDirtyFlag(false);
      }

      // Sync queued TIDAL playlist operations in background
      void get().drainTidalSyncQueue();
    } catch (err) {
      console.error('[musicStore] syncMusicWithFirestore failed:', err);
    }
  },

  drainTidalSyncQueue: async () => {
    if (tidalDrainInProgress) return;
    tidalDrainInProgress = true;
    try {
      const state = await NetInfo.fetch();
      if (!state.isConnected) return;

      const tidalQueue = await getTidalSyncQueue();
      if (tidalQueue.length === 0) return;

      const succeeded: TidalSyncQueueItem[] = [];
      const failed: { item: TidalSyncQueueItem; error: string }[] = [];

      for (let i = 0; i < tidalQueue.length; i++) {
        const item = tidalQueue[i];
        get().startTidalSync(item.trackId);
        try {
          await syncTrackToConfiguredTidalPlaylist({
            id: item.trackId,
            trackName: item.trackName,
            rating: item.rating,
            previousRating: item.previousRating,
            firebaseId: item.firebaseId,
          });
          await removeFromTidalSyncQueue(item.firebaseId);
          succeeded.push(item);
        } catch (err) {
          console.error(`[musicStore] TIDAL sync failed for '${item.trackName}':`, err);
          failed.push({ item, error: err instanceof Error ? err.message : String(err) });
        } finally {
          get().finishTidalSync(item.trackId);
        }
        if (i < tidalQueue.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      for (const item of succeeded) {
        const name = item.trackName || 'Unknown';
        if (item.previousRating != null && item.previousRating !== item.rating) {
          showToast(`${name}: ${item.previousRating} → ${item.rating}`);
        } else if (item.rating === 0) {
          showToast(`${name}: removed from playlist`);
        } else {
          showToast(`${name}: synced to rating ${item.rating}`);
        }
      }

      if (failed.length > 0) {
        const names = failed.map(f => f.item.trackName || 'Unknown').join(', ');
        showToast(`Failed to sync: ${names}`, 'error');
      }
    } catch (err) {
      console.error('[musicStore] drainTidalSyncQueue failed:', err);
    } finally {
      tidalDrainInProgress = false;
    }
  },

  // ===== CORE ACTIONS =====
  loadMusic: async (sortMode: SortMode = 'release') => {
    try {
      set({ loading: true, error: null });

      const { music: cachedMusic, lastModified: cachedLastModified } = await getCachedMusic();
      const persistedDirty = await getDirtyFlag();
      set({ _dirty: persistedDirty });

      const state = await NetInfo.fetch();
      if (!state.isConnected) {
        set({
          savedMusic: cachedMusic,
          currentSortMode: sortMode,
          loading: false,
          refreshing: false,
          lastUpdated: Date.now()
        });
        return;
      }

      // Sync offline changes before fetching
      if (persistedDirty) {
        console.log('[musicStore] Syncing offline changes before loading...');
        await get().syncMusicWithFirestore();
        const freshCache = await getCachedMusic();
        set({
          savedMusic: freshCache.music,
          currentSortMode: sortMode,
          loading: false,
          refreshing: false,
          lastUpdated: Date.now()
        });
        return;
      }

      const firestoreLastModified = await getFirestoreLastModified();

      // Decide whether to use cache or fetch from Firestore
      const shouldUseCache = 
        cachedMusic.length > 0 &&
        typeof cachedLastModified === 'number' &&
        typeof firestoreLastModified === 'number' &&
        cachedLastModified >= firestoreLastModified;

      let music: SavedMusic[];
      let lastModified: number;

      if (shouldUseCache) {
        music = cachedMusic;
        lastModified = cachedLastModified!;
      } else {
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

      void get().drainTidalSyncQueue();
    } catch (error) {
      console.error('[musicStore] loadMusic error:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to load music',
        loading: false,
        refreshing: false
      });
    }
  },

  addMusic: (music: SavedMusic) => {
    const { savedMusic } = get();
    if (savedMusic.some(m => m.id === music.id)) return;

    const newMusic = [...savedMusic, music];
    const newLastModified = Date.now();
    
    set({ 
      savedMusic: newMusic,
      lastUpdated: newLastModified,
      _dirty: true
    });
    
    setDirtyFlag(true);
    setCachedMusic(newMusic, newLastModified);
    get().syncMusicWithFirestore();
  },

  addMusicBatch: (musics: SavedMusic[]) => {
    const { savedMusic } = get();
    const existingIds = new Set(savedMusic.map(m => m.id));
    const newMusics = musics.filter(m => !existingIds.has(m.id));
    
    if (newMusics.length === 0) return;

    const updatedMusic = [...savedMusic, ...newMusics];
    const newLastModified = Date.now();
    
    set({ 
      savedMusic: updatedMusic,
      lastUpdated: newLastModified,
      _dirty: true
    });
    
    setDirtyFlag(true);
    setCachedMusic(updatedMusic, newLastModified);
    get().syncMusicWithFirestore();
  },

  updateRating: async (firebaseId: string, rating: number, tags?: string[]): Promise<boolean> => {
    if (get().isRatingUpdating(firebaseId)) {
      console.warn('[musicStore] Rating update already in progress:', firebaseId);
      return false;
    }

    try {
      get().startRatingUpdate(firebaseId);

      const { savedMusic } = get();
      const now = new Date().toISOString();
      let newRatingHistory: RatingHistoryEntry[] = [];
      let prevRating: number | undefined;
      let prevTags: string[] = [];

      const updatedMusic = savedMusic.map(music => {
        if (music.firebaseId === firebaseId) {
          prevRating = music.rating;
          prevTags = music.tags;
          newRatingHistory = music.rating !== rating
            ? [...(music.ratingHistory || []), { rating, timestamp: now }]
            : music.ratingHistory || [];
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

      await setDirtyFlag(true);
      await addDirtyMusicId(firebaseId);
      await setCachedMusic(updatedMusic, newLastModified);

      // Update Firestore if online
      const state = await NetInfo.fetch();
      if (state.isConnected) {
        const updateObj: any = { rating, tags: tags ?? [] };
        if (prevRating !== undefined && prevRating !== rating) {
          updateObj.ratingHistory = newRatingHistory;
        }

        const updatedTrack = updatedMusic.find(music => music.firebaseId === firebaseId);
        const trackName = updatedTrack ? `${updatedTrack.title} - ${updatedTrack.artist}` : 'Unknown';

        try {
          await updateDoc(doc(db, 'savedMusic', firebaseId), updateObj);
        } catch (error) {
          showToast(`Failed to update '${trackName}' on Firebase: ${error instanceof Error ? error.message : error}`, 'error');
          return false;
        }

        await removeDirtyMusicId(firebaseId);

        const dirtyIds = await getDirtyMusicIds();
        if (dirtyIds.size === 0) {
          set({ _dirty: false });
          await setDirtyFlag(false);
        }

        const syncedTimestamp = Date.now();
        await setSavedMusicMeta(syncedTimestamp);
        await setCachedMusic(updatedMusic, syncedTimestamp);
        set({ lastUpdated: syncedTimestamp });

        if (updatedTrack) {
          await enqueueTidalSync({
            trackId: updatedTrack.id,
            trackName: updatedTrack.title,
            rating,
            previousRating: prevRating,
            firebaseId,
          });
          get().startTidalSync(updatedTrack.id);
          void syncTrackToConfiguredTidalPlaylist({
            id: updatedTrack.id,
            rating,
            previousRating: prevRating,
            firebaseId,
            trackName,
          }).then(async () => {
            await removeFromTidalSyncQueue(firebaseId);
          }).catch((err) => {
            console.error('[musicStore] Online TIDAL sync failed (queued for retry):', err);
          }).finally(() => {
            get().finishTidalSync(updatedTrack.id);
          });

          if (tags) {
            void syncTagTidalPlaylists(updatedTrack.id, prevTags, tags);
          }
        }
      } else {
        console.log('[musicStore] Offline rating update queued for sync');
        const updatedTrack = updatedMusic.find(music => music.firebaseId === firebaseId);
        if (updatedTrack) {
          await enqueueTidalSync({
            trackId: updatedTrack.id,
            trackName: updatedTrack.title,
            rating,
            previousRating: prevRating,
            firebaseId,
          });
        }
      }

      return true;
    } catch (error) {
      console.error('[musicStore] updateRating error:', error);
      return false;
    } finally {
      get().finishRatingUpdate(firebaseId);
    }
  },

  deleteMusic: async (firebaseId: string): Promise<boolean> => {
    if (get().isMusicDeleting(firebaseId)) {
      console.warn('[musicStore] Delete already in progress:', firebaseId);
      return false;
    }

    try {
      get().startMusicDelete(firebaseId);

      const { savedMusic } = get();
      const updatedMusic = savedMusic.filter(music => music.firebaseId !== firebaseId);
      const newLastModified = Date.now();

      set({
        savedMusic: updatedMusic,
        lastUpdated: newLastModified,
        _dirty: true
      });

      await setDirtyFlag(true);
      await setCachedMusic(updatedMusic, newLastModified);
      get().syncMusicWithFirestore();

      const state = await NetInfo.fetch();
      if (state.isConnected) {
        await deleteMusic(firebaseId);
      } else {
        const deletedIds = await getDeletedMusicIds();
        if (!deletedIds.includes(firebaseId)) {
          await setDeletedMusicIds([...deletedIds, firebaseId]);
        }
      }

      return true;
    } catch (error) {
      console.error('[musicStore] deleteMusic error:', error);
      return false;
    } finally {
      get().finishMusicDelete(firebaseId);
    }
  },

  updateSong: async (firebaseId: string, updates: Partial<SavedMusic>): Promise<boolean> => {
    try {
      const { savedMusic } = get();
      const existing = savedMusic.find(m => m.firebaseId === firebaseId);
      if (!existing) return false;

      const prevTags = existing.tags;
      const updated = { ...existing, ...updates };
      const updatedMusic = savedMusic.map(m => m.firebaseId === firebaseId ? updated : m);
      const newLastModified = Date.now();

      set({
        savedMusic: updatedMusic,
        lastUpdated: newLastModified,
        _dirty: true,
      });

      await setDirtyFlag(true);
      await addDirtyMusicId(firebaseId);
      await setCachedMusic(updatedMusic, newLastModified);

      const state = await NetInfo.fetch();
      if (state.isConnected) {
        try {
          await updateDoc(doc(db, 'savedMusic', firebaseId), updates as any);
          await removeDirtyMusicId(firebaseId);

          const dirtyIds = await getDirtyMusicIds();
          if (dirtyIds.size === 0) {
            set({ _dirty: false });
            await setDirtyFlag(false);
          }

          const syncedTimestamp = Date.now();
          await setSavedMusicMeta(syncedTimestamp);
          await setCachedMusic(updatedMusic, syncedTimestamp);
          set({ lastUpdated: syncedTimestamp });
        } catch (error) {
          showToast(`Failed to update song on Firebase: ${error instanceof Error ? error.message : error}`, 'error');
        }

        if (updates.tags && existing.id) {
          void syncTagTidalPlaylists(existing.id, prevTags, updates.tags);
        }
      }

      return true;
    } catch (error) {
      console.error('[musicStore] updateSong error:', error);
      return false;
    }
  },

  refresh: (sortMode?: SortMode) => {
    set({ refreshing: true });
    get().loadMusic(sortMode || get().currentSortMode);
  },

  clearError: () => set({ error: null }),

  // ===== OPERATION ACTIONS =====
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
      set({ operations: { ...operations, savingTracks: newSet } });
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
      set({ operations: { ...operations, savingAlbums: newSet } });
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
      set({ operations: { ...operations, updatingRatings: newSet } });
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
      set({ operations: { ...operations, deletingMusic: newSet } });
    }
  },

  startTidalSync: (trackId: string) => {
    const current = get().tidalSyncingIds;
    if (!current.has(trackId)) {
      set({ tidalSyncingIds: new Set(current).add(trackId) });
    }
  },

  finishTidalSync: (trackId: string) => {
    const current = get().tidalSyncingIds;
    if (current.has(trackId)) {
      const newSet = new Set(current);
      newSet.delete(trackId);
      set({ tidalSyncingIds: newSet });
    }
  },

  isTidalSyncing: (trackId: string) =>
    get().isOnline && get().tidalSyncingIds.has(trackId),

  // ===== HELPER FUNCTIONS =====
  updateRatingHistory: async (firebaseId: string, entryIdx: number, newRating?: number) => {
    const { savedMusic } = get();
    let prevRating: number | undefined;
    let prevTags: string[] = [];

    const updatedMusic = savedMusic.map(music => {
      if (music.firebaseId === firebaseId && music.ratingHistory) {
        prevRating = music.rating;
        prevTags = music.tags;
        const newHistory = music.ratingHistory.filter((_, idx) => idx !== entryIdx);
        return { ...music, rating: newRating ?? music.rating, ratingHistory: newHistory };
      }
      return music;
    });

    set({ savedMusic: updatedMusic, _dirty: true });
    const newLastModified = Date.now();
    await setDirtyFlag(true);
    await addDirtyMusicId(firebaseId);
    await setCachedMusic(updatedMusic, newLastModified);

    try {
      const music = updatedMusic.find(m => m.firebaseId === firebaseId);
      if (music?.firebaseId) {
        await updateDoc(
          doc(db, 'savedMusic', music.firebaseId),
          { rating: music.rating, ratingHistory: music.ratingHistory || [] }
        );
      }
    } catch (err) {
      console.error('[musicStore] updateRatingHistory error:', err);
      return;
    }

    await removeDirtyMusicId(firebaseId);
    const dirtyIds = await getDirtyMusicIds();
    if (dirtyIds.size === 0) {
      set({ _dirty: false });
      await setDirtyFlag(false);
    }

    const syncedTimestamp = Date.now();
    await setSavedMusicMeta(syncedTimestamp);
    await setCachedMusic(updatedMusic, syncedTimestamp);
    set({ lastUpdated: syncedTimestamp });

    const updatedTrack = updatedMusic.find(m => m.firebaseId === firebaseId);
    if (updatedTrack && newRating !== undefined) {
      const trackName = `${updatedTrack.title} - ${updatedTrack.artist}`;
      await enqueueTidalSync({
        trackId: updatedTrack.id,
        trackName: updatedTrack.title,
        rating: newRating,
        previousRating: prevRating,
        firebaseId,
      });
      get().startTidalSync(updatedTrack.id);
      void syncTrackToConfiguredTidalPlaylist({
        id: updatedTrack.id,
        rating: newRating,
        previousRating: prevRating,
        firebaseId,
        trackName,
      }).then(async () => {
        await removeFromTidalSyncQueue(firebaseId);
      }).catch((err) => {
        console.error('[musicStore] Online TIDAL sync failed (queued for retry):', err);
      }).finally(() => {
        get().finishTidalSync(updatedTrack.id);
      });
    }
  },

  getSavedMusicById: (trackId: string) => 
    get().savedMusic.find(m => m.id === trackId) || null,

  isMusicSaved: (trackId: string) => 
    get().savedMusic.some(m => m.id === trackId),

  getMusicCount: () => get().savedMusic.length,

  isTrackSaving: (trackId: string) => 
    get().operations.savingTracks.has(trackId),

  isAlbumSaving: (albumId: string) => 
    get().operations.savingAlbums.has(albumId),

  isRatingUpdating: (firebaseId: string) => 
    get().operations.updatingRatings.has(firebaseId),

  isMusicDeleting: (firebaseId: string) => 
    get().operations.deletingMusic.has(firebaseId),

  isAnyOperationInProgress: () => {
    const { operations } = get();
    return operations.savingTracks.size > 0 ||
           operations.savingAlbums.size > 0 ||
           operations.updatingRatings.size > 0 ||
           operations.deletingMusic.size > 0;
  },
}));

// ===== INITIALIZATION =====
useMusicStore.getState().loadMusic();

// Network listener for automatic sync when coming online
NetInfo.addEventListener(async state => {
  useMusicStore.setState({ isOnline: !!state.isConnected });
  if (state.isConnected) {
    const store = useMusicStore.getState();
    const tidalQueue = await getTidalSyncQueue();
    if (store._dirty || tidalQueue.length > 0) {
      store.syncMusicWithFirestore();
    }
  }
});
