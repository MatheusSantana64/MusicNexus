// src/store/tagStore.ts
// Zustand store for managing music tags
import { create } from 'zustand';
import { Tag } from '../types';
import { 
  getCachedTags, 
  setCachedTags, 
  getTagsFirestoreLastModified, 
  fetchTagsFromFirestore 
} from '../services/firestoreCacheService';
import { setTagsMeta } from '../services/firestoreMetaHelper';
import NetInfo from '@react-native-community/netinfo';
import { addTag, updateTag, deleteTag } from '../services/tagService';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface TagState {
  tags: Tag[];
  loading: boolean;
  error: string | null;
  lastUpdated: number;

  // Actions
  loadTags: () => Promise<void>;
  addTag: (tag: Omit<Tag, 'id'>) => Promise<string | null>;
  updateTag: (id: string, tag: Partial<Tag>) => Promise<boolean>;
  deleteTag: (id: string) => Promise<boolean>;
  refresh: () => void;
  clearError: () => void;
}

export const useTagStore = create<TagState & { _dirty?: boolean; syncTagsWithFirestore?: () => Promise<void> }>((set, get) => ({
  tags: [],
  loading: true,
  error: null,
  lastUpdated: 0,
  // --- OFFLINE SYNC STATE ---
  _dirty: false, // not exposed in TagState, internal only

  // --- SYNC LOGIC ---
  syncTagsWithFirestore: async () => {
    try {
      const state = await NetInfo.fetch();
      if (!state.isConnected) {
        return;
      }
      const { tags: cachedTags, lastModified: cachedLastModified } = await getCachedTags();
      const firestoreLastModified = await getTagsFirestoreLastModified();

      // --- NEW: Sync deleted tag IDs ---
      const deletedIds = await getDeletedTagIds();
      if (deletedIds.length > 0) {
        const { db } = require('../config/firebaseConfig');
        const { doc, deleteDoc } = require('firebase/firestore');
        for (const id of deletedIds) {
          try {
            await deleteDoc(doc(db, 'tags', id));
          } catch (err) {
            console.warn('[tagStore] Failed to delete tag from Firestore during sync:', id, err);
          }
        }
        await setDeletedTagIds([]); // Clear after syncing
      }

      if (
        typeof cachedLastModified === 'number' &&
        (firestoreLastModified === null || cachedLastModified > firestoreLastModified)
      ) {
        // Push local cache to Firestore
        const { db } = require('../config/firebaseConfig');
        const { doc, setDoc } = require('firebase/firestore');
        for (const tag of cachedTags) {
          if (!tag.id) continue;
          const docRef = doc(db, 'tags', tag.id);
          const { id, ...tagData } = tag;
          await setDoc(docRef, tagData, { merge: true });
        }
        await setTagsMeta(cachedLastModified);
        set({ _dirty: false });
      }
    } catch (err) {
      console.error('[tagStore] syncTagsWithFirestore: Sync failed', err);
    }
  },

  loadTags: async () => {
    try {
      set({ loading: true, error: null });
      const { tags: cachedTags, lastModified: cachedLastModified } = await getCachedTags();

      // 1. Check network status
      const state = await NetInfo.fetch();
      if (!state.isConnected) {
        // Offline: use cache immediately if available
        set({
          tags: cachedTags,
          loading: false,
          lastUpdated: Date.now(),
        });
        return;
      }

      // 2. Get Firestore lastModified
      const firestoreLastModified = await getTagsFirestoreLastModified();

      // 3. Decide whether to use cache or fetch from Firestore
      let useCache = false;
      if (
        firestoreLastModified === null ||
        cachedLastModified === null ||
        typeof cachedLastModified !== 'number'
      ) {
        useCache = false;
      } else if (cachedLastModified >= firestoreLastModified) {
        useCache = true;
      }

      let tags: Tag[] = [];
      let lastModified = firestoreLastModified ?? Date.now();

      if (useCache && cachedTags.length > 0) {
        tags = cachedTags;
      } else {
        const result = await fetchTagsFromFirestore();
        tags = result.tags;
        lastModified = result.lastModified || Date.now();
        await setCachedTags(tags, lastModified);
      }

      set({
        tags,
        loading: false,
        lastUpdated: Date.now(),
      });
      (get() as any).syncTagsWithFirestore();
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load tags',
        loading: false,
      });
    }
  },

  addTag: async (tag: Omit<Tag, 'id'>) => {
    try {
      set({ loading: true, error: null });
      // Optimistic update: add to local state and cache
      const id = Math.random().toString(36).substr(2, 9); // temp id for offline
      const newTag = { ...tag, id };
      const { tags } = get();
      const updatedTags = [...tags, newTag];
      const newLastModified = Date.now();
      set({ tags: updatedTags, lastUpdated: newLastModified, _dirty: true, loading: false });
      setCachedTags(updatedTags, newLastModified);
      (get() as any).syncTagsWithFirestore();
      // Try to add to Firestore if online (will be merged by sync)
      try { await addTag(tag); } catch {}
      return id;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to add tag', loading: false });
      return null;
    }
  },

  updateTag: async (id: string, tag: Partial<Tag>) => {
    set({ loading: true, error: null });
    try {
      // Optimistic update: update in local state and cache
      const { tags } = get();
      const updatedTags = tags.map(t => t.id === id ? { ...t, ...tag } : t);
      const newLastModified = Date.now();
      set({ tags: updatedTags, lastUpdated: newLastModified, _dirty: true, loading: false });
      setCachedTags(updatedTags, newLastModified);
      (get() as any).syncTagsWithFirestore();
      // Try to update in Firestore if online (will be merged by sync)
      try { await updateTag(id, tag); } catch {}
      return true;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to update tag', loading: false });
      return false;
    }
  },

  deleteTag: async (id: string) => {
    // Always update local state instantly for offline UX
    const { tags } = get();
    const updatedTags = tags.filter(t => t.id !== id);
    const newLastModified = Date.now();
    set({ tags: updatedTags, lastUpdated: newLastModified, _dirty: true, loading: false });
    setCachedTags(updatedTags, newLastModified);

    // Check network status
    const state = await NetInfo.fetch();
    if (state.isConnected) {
      set({ loading: true });
      try {
        await deleteTag(id);
        (get() as any).syncTagsWithFirestore();
        set({ loading: false });
        return true;
      } catch (error) {
        set({ error: error instanceof Error ? error.message : 'Failed to delete tag', loading: false });
        return false;
      }
    } else {
      // Offline: track for later sync, but don't set loading
      const deletedIds = await getDeletedTagIds();
      if (!deletedIds.includes(id)) {
        deletedIds.push(id);
        await setDeletedTagIds(deletedIds);
      }
      // No loading spinner for offline delete
      return true;
    }
  },

  refresh: () => {
    set({ loading: true });
    get().loadTags();
  },

  clearError: () => {
    set({ error: null });
  },
}));

const DELETED_TAG_IDS_KEY = 'deletedTagIds';

async function getDeletedTagIds(): Promise<string[]> {
  const json = await AsyncStorage.getItem(DELETED_TAG_IDS_KEY);
  return json ? JSON.parse(json) : [];
}
async function setDeletedTagIds(ids: string[]): Promise<void> {
  await AsyncStorage.setItem(DELETED_TAG_IDS_KEY, JSON.stringify(ids));
}

// Optionally, initialize tags on app start
useTagStore.getState().loadTags();