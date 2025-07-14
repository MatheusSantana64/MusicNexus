// src/services/musicService.ts
// Music service for saving, updating, and deleting music with validation
import { 
  collection, 
  addDoc, 
  getDocs, 
  updateDoc, 
  doc, 
  deleteDoc, 
  query, 
  orderBy,
  QueryConstraint 
} from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import { SavedMusic, DeezerTrack } from '../types/music';
import { DeezerService } from './deezerService';
import { 
  validateSavedMusicInput,
  safeParseFirebaseMusicDocument,
  ValidatedSavedMusicInput 
} from '../utils/validators';

const COLLECTION_NAME = 'savedMusic';
const DEFAULT_RELEASE_DATE = '1900-01-01';

export type SortMode = 'savedAt' | 'release';

interface SaveMusicOptions {
  rating?: number;
}

// === CORE FUNCTIONS ===

export async function saveMusic(track: DeezerTrack, options: SaveMusicOptions = {}): Promise<string> {
  const { rating = 0 } = options;
  
  if (!track?.id || !track?.title || !track?.artist?.name) {
    throw new Error('Invalid track data');
  }

  if (rating < 0 || rating > 10 || !Number.isInteger(rating)) {
    throw new Error('Rating must be an integer between 0 and 10');
  }

  try {
    const musicData: Omit<SavedMusic, 'firebaseId'> = {
      id: track.id,
      title: track.title,
      artist: track.artist.name,
      artistId: track.artist.id,
      album: track.album.title,
      albumId: track.album.id,
      coverUrl: track.album.cover_medium,
      preview: track.preview,
      duration: track.duration,
      rating,
      releaseDate: DeezerService.getTrackReleaseDate(track) || DEFAULT_RELEASE_DATE,
      trackPosition: track.track_position || 0,
      diskNumber: track.disk_number || 1,
      savedAt: new Date(),
    };

    // 🛡️ VALIDATE WITH ZOD BEFORE SAVING
    const validatedMusicData = validateSavedMusicInput(musicData);

    const docRef = await addDoc(collection(db, COLLECTION_NAME), validatedMusicData);
    console.log('✅ Music validated and saved to Firebase:', validatedMusicData.title);
    return docRef.id;
  } catch (error) {
    console.error('Error saving song:', error);
    throw new Error(`Failed to save music: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function getSavedMusic(sortMode: SortMode = 'savedAt'): Promise<SavedMusic[]> {
  try {
    const constraints: QueryConstraint[] = [];
    
    if (sortMode === 'savedAt') {
      constraints.push(orderBy('savedAt', 'desc'));
    }
    
    const q = query(collection(db, COLLECTION_NAME), ...constraints);
    const querySnapshot = await getDocs(q);
    
    const musics = querySnapshot.docs
      .map(doc => {
        const rawData = {
          ...doc.data(),
          firebaseId: doc.id,
          savedAt: doc.data().savedAt.toDate(),
        };

        // 🛡️ VALIDATE WITH ZOD
        const validatedDoc = safeParseFirebaseMusicDocument(rawData);
        if (!validatedDoc) {
          console.warn(`Invalid Firebase document ${doc.id}, skipping:`, rawData);
          return null;
        }

        return validatedDoc as SavedMusic;
      })
      .filter((music): music is SavedMusic => music !== null);

    console.log(`✅ Loaded ${musics.length} validated music documents from Firebase`);
    return sortMode === 'release' ? sortMusicByRelease(musics) : musics;
  } catch (error) {
    console.error('Error getting saved music:', error);
    throw new Error('Failed to load saved music from database');
  }
}

export async function updateMusicRating(firebaseId: string, rating: number): Promise<void> {
  if (!firebaseId?.trim()) {
    throw new Error('Firebase ID is required');
  }

  if (rating < 0 || rating > 10 || !Number.isInteger(rating)) {
    throw new Error('Rating must be an integer between 0 and 10');
  }

  try {
    await updateDoc(doc(db, COLLECTION_NAME, firebaseId), { rating });
    console.log(`✅ Rating updated for document ${firebaseId}: ${rating}`);
  } catch (error) {
    console.error('Error updating rating:', error);
    throw new Error(`Failed to update rating: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function deleteMusic(firebaseId: string): Promise<void> {
  if (!firebaseId?.trim()) {
    throw new Error('Firebase ID is required');
  }

  try {
    await deleteDoc(doc(db, COLLECTION_NAME, firebaseId));
    console.log(`✅ Music deleted from Firebase: ${firebaseId}`);
  } catch (error) {
    console.error('Error deleting music:', error);
    throw new Error(`Failed to delete music: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// === BATCH OPERATIONS ===
export async function saveMusicBatch(tracks: DeezerTrack[], rating: number = 0): Promise<string[]> {
  console.log(`📦 Starting batch save of ${tracks.length} tracks with rating ${rating}`);
  
  const results = await Promise.allSettled(
    tracks.map(track => saveMusic(track, { rating }))
  );
  
  const successful = results
    .filter((result): result is PromiseFulfilledResult<string> => result.status === 'fulfilled')
    .map(result => result.value);
    
  const failed = results.filter(result => result.status === 'rejected').length;
  
  console.log(`✅ Batch save completed: ${successful.length} successful, ${failed} failed`);
  return successful;
}

// === HELPERS ===
function sortMusicByRelease(musics: SavedMusic[]): SavedMusic[] {
  return musics.sort((a, b) => {
    const dateComparison = new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime();
    if (dateComparison !== 0) return dateComparison;
    
    const albumComparison = a.album.localeCompare(b.album);
    if (albumComparison !== 0) return albumComparison;
    
    if (a.diskNumber !== b.diskNumber) return a.diskNumber - b.diskNumber;
    
    return a.trackPosition - b.trackPosition;
  });
}

// === UTILITY FUNCTIONS (simplified) ===
export async function getSavedMusicById(trackId: string): Promise<SavedMusic | null> {
  if (!trackId?.trim()) return null;
  
  try {
    const musics = await getSavedMusic();
    return musics.find(music => music.id === trackId) || null;
  } catch (error) {
    console.error('Error getting saved music by ID:', error);
    return null;
  }
}