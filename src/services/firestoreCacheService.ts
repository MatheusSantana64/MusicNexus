// src/services/firestoreCacheService.ts
// This service handles caching of music data in AsyncStorage and fetching from Firestore.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import { SavedMusic, Tag } from '../types/music';
import { safeParseFirebaseMusicDocument } from '../utils/validators';

const CACHE_KEY_MUSIC = 'savedMusicCache';
const CACHE_KEY_LAST_MODIFIED = 'savedMusicCacheLastModified';
const META_DOC_ID = '_meta';

const TAGS_CACHE_KEY = 'tagsCache';
const TAGS_LAST_MODIFIED_KEY = 'tagsCacheLastModified';
const TAGS_META_DOC_ID = '_meta';

export async function getCachedMusic(): Promise<{ music: SavedMusic[]; lastModified: number | null }> {
  try {
    console.log('[firestoreCacheService] getCachedMusic: Checking AsyncStorage for cache...', '📦');
    const [musicJson, lastModifiedStr] = await Promise.all([
      AsyncStorage.getItem(CACHE_KEY_MUSIC),
      AsyncStorage.getItem(CACHE_KEY_LAST_MODIFIED),
    ]);
    let music = musicJson ? JSON.parse(musicJson) as SavedMusic[] : [];
    // Convert savedAt to Date object
    music = music.map(m => ({
      ...m,
      savedAt: m.savedAt ? new Date(m.savedAt) : new Date()
    }));
    const lastModified = lastModifiedStr ? Number(lastModifiedStr) : null;
    console.log('[firestoreCacheService] getCachedMusic: Parsed cache:', { musicCount: music.length, lastModified }, '📦');
    return { music, lastModified };
  } catch (err) {
    console.warn('[firestoreCacheService] getCachedMusic: Error reading cache:', err, '📦⚠️');
    return { music: [], lastModified: null };
  }
}

export async function setCachedMusic(music: SavedMusic[], lastModified: number): Promise<void> {
  try {
    console.log('[firestoreCacheService] setCachedMusic: Saving cache with', music.length, 'items, lastModified:', lastModified, '📦⬆️');
    await AsyncStorage.setItem(CACHE_KEY_MUSIC, JSON.stringify(music));
    await AsyncStorage.setItem(CACHE_KEY_LAST_MODIFIED, String(lastModified));
    console.log('[firestoreCacheService] setCachedMusic: Cache saved successfully', '📦✅');
  } catch (err) {
    console.error('[firestoreCacheService] setCachedMusic: Error saving cache:', err, '📦❌');
  }
}

export async function getFirestoreLastModified(): Promise<number | null> {
  try {
    console.log('[firestoreCacheService] getFirestoreLastModified: Fetching _meta doc from Firestore... 🔥');
    const metaDocRef = doc(collection(db, 'savedMusic'), META_DOC_ID);
    const metaDocSnap = await getDoc(metaDocRef);
    if (!metaDocSnap.exists()) {
      console.warn('[firestoreCacheService] getFirestoreLastModified: _meta doc does not exist', '🔥⚠️');
      return null;
    }
    const data = metaDocSnap.data();
    console.log('[firestoreCacheService] getFirestoreLastModified: _meta doc data:', data, ' 🔥');
    return typeof data.lastModified === 'number' ? data.lastModified : null;
  } catch (err) {
    console.error('[firestoreCacheService] getFirestoreLastModified: Error fetching Firestore lastModified:', err, '🔥❌');
    return null;
  }
}

export async function fetchMusicFromFirestore(): Promise<{ music: SavedMusic[]; lastModified: number }> {
  try {
    console.log('[firestoreCacheService] fetchMusicFromFirestore: Fetching all docs from Firestore...', '🌐⬇️');
    const colRef = collection(db, 'savedMusic');
    const snapshot = await getDocs(colRef);
    let lastModified = 0;
    const music: SavedMusic[] = [];
    snapshot.forEach(docSnap => {
      if (docSnap.id === META_DOC_ID) {
        const meta = docSnap.data();
        if (typeof meta.lastModified === 'number') lastModified = meta.lastModified;
        console.log('[firestoreCacheService] fetchMusicFromFirestore: Found _meta doc:', meta, '🔥');
      } else {
        const raw = { ...docSnap.data(), firebaseId: docSnap.id, savedAt: docSnap.data().savedAt?.toDate?.() ?? new Date() };
        const validated = safeParseFirebaseMusicDocument(raw);
        if (validated) {
          music.push(validated);
        } else {
          console.warn('[firestoreCacheService] fetchMusicFromFirestore: Invalid music doc skipped:', docSnap.id, raw, '🌐⚠️');
        }
      }
    });
    console.log('[firestoreCacheService] fetchMusicFromFirestore: Fetched', music.length, 'music docs, lastModified:', lastModified, '🌐✅');
    return { music, lastModified };
  } catch (err) {
    console.error('[firestoreCacheService] fetchMusicFromFirestore: Error fetching music:', err, '🌐❌');
    return { music: [], lastModified: Date.now() };
  }
}

export async function getCachedTags(): Promise<{ tags: Tag[]; lastModified: number | null }> {
  try {
    const [tagsJson, lastModifiedStr] = await Promise.all([
      AsyncStorage.getItem(TAGS_CACHE_KEY),
      AsyncStorage.getItem(TAGS_LAST_MODIFIED_KEY),
    ]);
    const tags = tagsJson ? JSON.parse(tagsJson) as Tag[] : [];
    const lastModified = lastModifiedStr ? Number(lastModifiedStr) : null;
    return { tags, lastModified };
  } catch {
    return { tags: [], lastModified: null };
  }
}

export async function setCachedTags(tags: Tag[], lastModified: number): Promise<void> {
  await AsyncStorage.setItem(TAGS_CACHE_KEY, JSON.stringify(tags));
  await AsyncStorage.setItem(TAGS_LAST_MODIFIED_KEY, String(lastModified));
}

export async function getTagsFirestoreLastModified(): Promise<number | null> {
  try {
    const metaDocRef = doc(collection(db, 'tags'), TAGS_META_DOC_ID);
    const metaDocSnap = await getDoc(metaDocRef);
    if (!metaDocSnap.exists()) return null;
    const data = metaDocSnap.data();
    return typeof data.lastModified === 'number' ? data.lastModified : null;
  } catch {
    return null;
  }
}

export async function fetchTagsFromFirestore(): Promise<{ tags: Tag[]; lastModified: number }> {
  const colRef = collection(db, 'tags');
  const snapshot = await getDocs(colRef);
  let lastModified = 0;
  const tags: Tag[] = [];
  snapshot.forEach(docSnap => {
    if (docSnap.id === TAGS_META_DOC_ID) {
      const meta = docSnap.data();
      if (typeof meta.lastModified === 'number') lastModified = meta.lastModified;
    } else {
      tags.push({ ...(docSnap.data() as Tag), id: docSnap.id });
    }
  });
  return { tags, lastModified };
}