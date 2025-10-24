// src/services/profileService.ts
// ProfileService for managing user profile data
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';

const PROFILE_DOC_ID = 'main';
const PROFILE_CACHE_KEY = 'profileCache';
const PROFILE_LAST_MODIFIED_KEY = 'profileCacheLastModified';

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

// Subscribe to remote profile doc changes (returns unsubscribe)
export function subscribeToProfileChanges(callback: (data: { notes?: string; ratingTooltips?: Record<string, string> } ) => void) {
  const ref = doc(db, 'userProfile', PROFILE_DOC_ID);
  const unsubscribe = onSnapshot(ref, snap => {
    try {
      if (snap.exists()) {
        const firestoreData = snap.data() as any;
        // Update local cache so other code that reads cache sees latest
        AsyncStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(firestoreData));
        if (typeof firestoreData.lastModified === 'number') {
          AsyncStorage.setItem(PROFILE_LAST_MODIFIED_KEY, String(firestoreData.lastModified));
        } else {
          AsyncStorage.setItem(PROFILE_LAST_MODIFIED_KEY, String(Date.now()));
        }
        callback(firestoreData);
      } else {
        callback({});
      }
    } catch (err) {
      console.error('[profileService] subscribeToProfileChanges error', err);
    }
  }, err => {
    console.error('[profileService] onSnapshot error', err);
  });

  return unsubscribe;
}