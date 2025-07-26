// src/services/firestoreMetaHelper.ts
// Set the last modified timestamp for the saved music metadata.
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';

export async function setSavedMusicMeta(lastModified?: number) {
  const metaDocRef = doc(db, 'savedMusic', '_meta');
  const timestamp = lastModified ?? Date.now();
  await setDoc(metaDocRef, { lastModified: timestamp }, { merge: true });
}

export async function setTagsMeta(lastModified?: number) {
  const metaDocRef = doc(db, 'tags', '_meta');
  const timestamp = lastModified ?? Date.now();
  await setDoc(metaDocRef, { lastModified: timestamp }, { merge: true });
}