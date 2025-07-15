import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, orderBy, query } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import { Tag } from '../types/music';

const COLLECTION_NAME = 'tags';

export async function getTags(): Promise<Tag[]> {
  const q = query(collection(db, COLLECTION_NAME), orderBy('position', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docSnap => ({
    ...(docSnap.data() as Tag),
    id: docSnap.id,
  }));
}

export async function addTag(tag: Omit<Tag, 'id'>): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTION_NAME), tag);
  return docRef.id;
}

export async function updateTag(id: string, tag: Partial<Tag>): Promise<void> {
  await updateDoc(doc(db, COLLECTION_NAME, id), tag);
}

export async function deleteTag(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION_NAME, id));
}