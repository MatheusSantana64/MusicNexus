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
import { addTag, updateTag, deleteTag } from '../services/tagService';

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

export const useTagStore = create<TagState>((set, get) => ({
  tags: [],
  loading: true,
  error: null,
  lastUpdated: 0,

  loadTags: async () => {
    try {
      set({ loading: true, error: null });
      const { tags: cachedTags, lastModified: cachedLastModified } = await getCachedTags();
      const firestoreLastModified = await getTagsFirestoreLastModified();

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
      const id = await addTag(tag);
      await get().loadTags();
      return id;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to add tag', loading: false });
      return null;
    }
  },

  updateTag: async (id: string, tag: Partial<Tag>) => {
    try {
      set({ loading: true, error: null });
      await updateTag(id, tag);
      await get().loadTags();
      return true;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to update tag', loading: false });
      return false;
    }
  },

  deleteTag: async (id: string) => {
    try {
      set({ loading: true, error: null });
      await deleteTag(id);
      await get().loadTags();
      return true;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to delete tag', loading: false });
      return false;
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

// Optionally, initialize tags on app start
useTagStore.getState().loadTags();