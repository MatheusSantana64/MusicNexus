import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, orderBy, query, where } from 'firebase/firestore';
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
  // Delete the tag document
  await deleteDoc(doc(db, 'tags', id));

  // Remove the tag from all songs
  const musicQuery = query(collection(db, 'savedMusic'), where('tags', 'array-contains', id));
  const snapshot = await getDocs(musicQuery);

  const updatePromises = snapshot.docs.map(docSnap => {
    const musicData = docSnap.data();
    const updatedTags = (musicData.tags || []).filter((tagId: string) => tagId !== id);
    return updateDoc(doc(db, 'savedMusic', docSnap.id), { tags: updatedTags });
  });

  await Promise.all(updatePromises);
}