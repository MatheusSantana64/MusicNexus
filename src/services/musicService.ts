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
  QueryConstraint,
  where 
} from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import { SavedMusic, DeezerTrack } from '../types';
import { DeezerService } from './deezer/deezerService';
import { 
  validateSavedMusicInput,
  safeParseFirebaseMusicDocument,
} from '../utils/validators';
import { setSavedMusicMeta } from './firestoreMetaHelper';

const COLLECTION_NAME = 'savedMusic';
const DEFAULT_RELEASE_DATE = '1900-01-01';

export type SortMode = 'added' | 'rating' | 'release' | 'alphabetical' | 'album' | 'artist';

interface SaveMusicOptions {
  rating?: number;
  tags?: string[];
}

// === CORE FUNCTIONS ===

export async function saveMusic(track: DeezerTrack, options: SaveMusicOptions = {}): Promise<string> {
  const { rating = 0, tags = [] } = options;
  
  if (!track?.id || !track?.title || !track?.artist?.name) {
    throw new Error('Invalid track data');
  }

  if (rating < 0 || rating > 10 || rating % 0.5 !== 0) {
    throw new Error('Rating must be between 0 and 10 in 0.5 increments');
  }

  try {
    const now = new Date().toISOString();
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
      tags,
      ratingHistory: rating > 0 ? [{ rating, timestamp: now }] : [],
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

export async function getSavedMusic(
  sortMode: SortMode = 'release',
  ratingFilter?: [number, number]
): Promise<SavedMusic[]> {
  try {
    const constraints: QueryConstraint[] = [];
    
    // Add database-level sorting for supported fields
    switch (sortMode) {
      case 'added':
        constraints.push(orderBy('savedAt', 'desc'));
        break;
      case 'rating':
        constraints.push(orderBy('rating', 'desc'));
        break;
      case 'release':
        constraints.push(orderBy('releaseDate', 'desc'));
        break;
      case 'alphabetical':
        constraints.push(orderBy('title', 'asc'));
        break;
      case 'album':
        constraints.push(orderBy('album', 'asc'));
        break;
      case 'artist':
        constraints.push(orderBy('artist', 'asc'));
        break;
    }
    
    // Add rating filter if provided
    if (ratingFilter) {
      constraints.push(where('rating', '>=', ratingFilter[0]));
      constraints.push(where('rating', '<=', ratingFilter[1]));
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

    console.log(`✅ Loaded ${musics.length} validated music documents from Firebase (sorted by ${sortMode})`);
    return musics;
  } catch (error) {
    console.error('Error loading saved music:', error);
    throw new Error(`Failed to load music: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function updateMusicRating(firebaseId: string, rating: number): Promise<void> {
  if (!firebaseId?.trim()) {
    throw new Error('Firebase ID is required');
  }

  if (rating < 0 || rating > 10 || rating % 0.5 !== 0) {
    throw new Error('Rating must be between 0 and 10 in 0.5 increments');
  }

  try {
    await updateDoc(doc(db, COLLECTION_NAME, firebaseId), { rating });
    await setSavedMusicMeta();
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
    await setSavedMusicMeta();
    console.log(`✅ Music deleted from Firebase: ${firebaseId}`);
  } catch (error) {
    console.error('Error deleting music:', error);
    throw new Error(`Failed to delete music: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function updateMusicRatingAndTags(firebaseId: string, rating: number, tags: string[]): Promise<void> {
  if (!firebaseId?.trim()) {
    throw new Error('Firebase ID is required');
  }

  if (rating < 0 || rating > 10 || rating % 0.5 !== 0) {
    throw new Error('Rating must be between 0 and 10 in 0.5 increments');
  }

  try {
    await updateDoc(doc(db, COLLECTION_NAME, firebaseId), { rating, tags });
    await setSavedMusicMeta();
    console.log(`✅ Rating and tags updated for document ${firebaseId}: ${rating}, tags: ${tags.join(', ')}`);
  } catch (error) {
    console.error('Error updating rating/tags:', error);
    throw new Error(`Failed to update rating/tags: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// === BATCH OPERATIONS ===
export async function saveMusicBatch(tracks: DeezerTrack[], rating: number = 0, tags: string[] = []): Promise<string[]> {
  console.log(`📦 Starting batch save of ${tracks.length} tracks with rating ${rating}`);
  
  const results = await Promise.allSettled(
    tracks.map(track => saveMusic(track, { rating, tags }))
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

// === UTILITY FUNCTIONS ===
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