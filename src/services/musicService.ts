import { collection, addDoc } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';

export async function saveMusic(music: { title: string; artist: string; id: string }) {
  try {
    const docRef = await addDoc(collection(db, 'savedMusic'), music);
    console.log('Song saved with ID:', docRef.id);
  } catch (error) {
    console.error('Error saving song:', error);
  }
}