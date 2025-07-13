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

// === CONSTANTS ===
const COLLECTION_NAME = 'savedMusic';
const DEFAULT_RELEASE_DATE = '1900-01-01';

// === TYPES ===
export type SortMode = 'savedAt' | 'release';

interface SaveMusicOptions {
  rating?: number;
  source?: SavedMusic['source'];
}

// === VALIDATION ===
function validateRating(rating: number): void {
  if (rating < 0 || rating > 10 || !Number.isInteger(rating)) {
    throw new Error('Rating must be an integer between 0 and 10');
  }
}

function validateFirebaseId(firebaseId: string): void {
  if (!firebaseId?.trim()) {
    throw new Error('Firebase ID is required');
  }
}

function validateTrack(track: DeezerTrack): void {
  if (!track?.id || !track?.title || !track?.artist?.name) {
    throw new Error('Invalid track data');
  }
}

// === CORE FUNCTIONS ===

/**
 * Salva uma música no Firestore com validações
 */
export async function saveMusic(
  track: DeezerTrack, 
  options: SaveMusicOptions = {}
): Promise<string> {
  const { rating = 0, source = 'deezer' } = options;
  
  try {
    validateTrack(track);
    validateRating(rating);

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
      trackPosition: track.track_position || 0, // Make sure this saves 0 instead of undefined
      diskNumber: track.disk_number || 1,
      savedAt: new Date(),
      source,
    };

    const docRef = await addDoc(collection(db, COLLECTION_NAME), musicData);
    return docRef.id;
  } catch (error) {
    console.error('Error saving song:', error);
    throw new Error(`Failed to save music: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Função unificada para buscar músicas com ordenação configurável
 */
export async function getSavedMusic(sortMode: SortMode = 'savedAt'): Promise<SavedMusic[]> {
  try {
    const constraints: QueryConstraint[] = [];
    
    // Adicionar ordenação no servidor quando possível
    if (sortMode === 'savedAt') {
      constraints.push(orderBy('savedAt', 'desc'));
    }
    
    const q = query(collection(db, COLLECTION_NAME), ...constraints);
    const querySnapshot = await getDocs(q);
    
    const musics = querySnapshot.docs.map(doc => ({
      ...doc.data() as Omit<SavedMusic, 'firebaseId'>,
      firebaseId: doc.id,
      savedAt: doc.data().savedAt.toDate(),
    }));

    return sortMode === 'release' ? sortMusicByRelease(musics) : musics;
  } catch (error) {
    console.error('Error getting saved music:', error);
    throw new Error('Failed to load saved music from database');
  }
}

/**
 * Atualiza a avaliação de uma música
 */
export async function updateMusicRating(firebaseId: string, rating: number): Promise<void> {
  try {
    validateFirebaseId(firebaseId);
    validateRating(rating);

    await updateDoc(doc(db, COLLECTION_NAME, firebaseId), { rating });
  } catch (error) {
    console.error('Error updating rating:', error);
    throw new Error(`Failed to update rating: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Remove uma música da biblioteca
 */
export async function deleteMusic(firebaseId: string): Promise<void> {
  try {
    validateFirebaseId(firebaseId);
    await deleteDoc(doc(db, COLLECTION_NAME, firebaseId));
  } catch (error) {
    console.error('Error deleting music:', error);
    throw new Error(`Failed to delete music: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// === UTILITY FUNCTIONS ===
export async function isMusicSaved(trackId: string): Promise<boolean> {
  const music = await getSavedMusicById(trackId);
  return music !== null;
}

export async function getSavedMusicById(trackId: string): Promise<SavedMusic | null> {
  try {
    if (!trackId?.trim()) return null;
    
    const musics = await getSavedMusic();
    return musics.find(music => music.id === trackId) || null;
  } catch (error) {
    console.error('Error getting saved music by ID:', error);
    return null;
  }
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

// === BATCH OPERATIONS ===
export async function saveMusicBatch(tracks: DeezerTrack[], rating: number = 0): Promise<string[]> {
  const results = await Promise.allSettled(
    tracks.map(track => saveMusic(track, { rating }))
  );
  
  return results
    .filter((result): result is PromiseFulfilledResult<string> => result.status === 'fulfilled')
    .map(result => result.value);
}