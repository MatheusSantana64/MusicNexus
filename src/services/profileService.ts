// src/services/profileService.ts
// ProfileService for managing user profile data
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';

const PROFILE_DOC_ID = 'main';
const PROFILE_CACHE_KEY = 'profileCache';
const PROFILE_LAST_MODIFIED_KEY = 'profileCacheLastModified';

type ProfileData = { notes?: string; ratingTooltips?: Record<string, string> };

// In-memory listener registry + single snapshot unsubscribe
const profileListeners = new Set<(data: ProfileData) => void>();
let profileSnapshotUnsub: (() => void) | null = null;

function startProfileSnapshotIfNeeded() {
  if (profileSnapshotUnsub) return;
  const ref = doc(db, 'userProfile', PROFILE_DOC_ID);
  profileSnapshotUnsub = onSnapshot(ref, snap => {
    try {
      if (snap.exists()) {
        const firestoreData = snap.data() as any;
        // Update local cache
        AsyncStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(firestoreData));
        if (typeof firestoreData.lastModified === 'number') {
          AsyncStorage.setItem(PROFILE_LAST_MODIFIED_KEY, String(firestoreData.lastModified));
        } else {
          AsyncStorage.setItem(PROFILE_LAST_MODIFIED_KEY, String(Date.now()));
        }
        // Notify listeners
        profileListeners.forEach(cb => {
          try { cb(firestoreData); } catch (err) { console.error('[profileService] listener error', err); }
        });
      } else {
        profileListeners.forEach(cb => {
          try { cb({}); } catch (err) { console.error('[profileService] listener error', err); }
        });
      }
    } catch (err) {
      console.error('[profileService] profile snapshot handler error', err);
    }
  }, err => {
    console.error('[profileService] onSnapshot error', err);
  });
}

function stopProfileSnapshotIfNeeded() {
  if (profileSnapshotUnsub && profileListeners.size === 0) {
    profileSnapshotUnsub();
    profileSnapshotUnsub = null;
  }
}

// NEW: add/remove listener helpers (returns unsubscribe)
export function addProfileChangeListener(cb: (data: ProfileData) => void): () => void {
  profileListeners.add(cb);
  startProfileSnapshotIfNeeded();
  return () => {
    profileListeners.delete(cb);
    stopProfileSnapshotIfNeeded();
  };
}

// Backwards-compatible alias using the old name
export function subscribeToProfileChanges(callback: (data: ProfileData) => void) {
  return addProfileChangeListener(callback);
}

export async function getProfileData(): Promise<{ notes?: string; ratingTooltips?: Record<string, string> }> {
  // 1. Try cache
  const [cacheJson, cacheLastModifiedStr] = await Promise.all([
    AsyncStorage.getItem(PROFILE_CACHE_KEY),
    AsyncStorage.getItem(PROFILE_LAST_MODIFIED_KEY),
  ]);
  const cache = cacheJson ? JSON.parse(cacheJson) : {};
  const cacheLastModified = cacheLastModifiedStr ? Number(cacheLastModifiedStr) : 0;

  // 2. Get Firestore lastModified
  const ref = doc(db, 'userProfile', PROFILE_DOC_ID);
  const snap = await getDoc(ref);
  let firestoreLastModified = 0;
  let firestoreData: any = {};
  if (snap.exists()) {
    firestoreData = snap.data();
    firestoreLastModified = typeof firestoreData.lastModified === 'number' ? firestoreData.lastModified : 0;
  }

  // 3. Compare and return the freshest
  if (firestoreLastModified > cacheLastModified) {
    // Update cache
    await AsyncStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(firestoreData));
    await AsyncStorage.setItem(PROFILE_LAST_MODIFIED_KEY, String(firestoreLastModified));
    return firestoreData;
  } else if (cacheLastModified > 0) {
    return cache;
  } else {
    return firestoreData;
  }
}

export async function setProfileData(data: Partial<{ notes: string; ratingTooltips: Record<string, string> }>) {
  // 1. Get current cache and merge
  const cacheJson = await AsyncStorage.getItem(PROFILE_CACHE_KEY);
  const cache = cacheJson ? JSON.parse(cacheJson) : {};
  const newData = { ...cache, ...data };
  const lastModified = Date.now();

  // 2. Save to Firestore (with lastModified)
  const ref = doc(db, 'userProfile', PROFILE_DOC_ID);
  await setDoc(ref, { ...newData, lastModified }, { merge: true });

  // 3. Save to cache
  await AsyncStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(newData));
  await AsyncStorage.setItem(PROFILE_LAST_MODIFIED_KEY, String(lastModified));
}