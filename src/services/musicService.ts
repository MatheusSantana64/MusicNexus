import { collection, addDoc, getDocs, updateDoc, doc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import { SavedMusic, DeezerTrack } from '../types/music';
import { DeezerService } from './deezerService';

export async function saveMusic(track: DeezerTrack, rating: number = 0): Promise<void> {
  try {
    // Obter a data de lançamento
    const releaseDate = getTrackReleaseDate(track) || '1900-01-01'; // Fallback para músicas sem data

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
      releaseDate,
      trackPosition: track.track_position || 0,
      diskNumber: track.disk_number || 1,
      savedAt: new Date(),
      source: 'deezer',
    };

    const docRef = await addDoc(collection(db, 'savedMusic'), musicData);
    console.log('Song saved with ID:', docRef.id);
  } catch (error) {
    console.error('Error saving song:', error);
    throw error;
  }
}

export async function getSavedMusic(): Promise<SavedMusic[]> {
  try {
    const q = query(collection(db, 'savedMusic'), orderBy('savedAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      ...doc.data() as Omit<SavedMusic, 'firebaseId'>,
      firebaseId: doc.id,
      savedAt: doc.data().savedAt.toDate(),
    }));
  } catch (error) {
    console.error('Error getting saved music:', error);
    return [];
  }
}

export async function getSavedMusicSortedByRelease(): Promise<SavedMusic[]> {
  try {
    // Buscar todas as músicas e ordenar hierarquicamente no cliente
    const q = query(collection(db, 'savedMusic'));
    const querySnapshot = await getDocs(q);
    
    const musics = querySnapshot.docs.map(doc => ({
      ...doc.data() as Omit<SavedMusic, 'firebaseId'>,
      firebaseId: doc.id,
      savedAt: doc.data().savedAt.toDate(),
    }));

    // Ordenação hierárquica: data > álbum > disco > posição
    return musics.sort((a, b) => {
      // 1. Primeiro por data de lançamento (mais recentes primeiro)
      const dateA = new Date(a.releaseDate).getTime();
      const dateB = new Date(b.releaseDate).getTime();
      if (dateA !== dateB) return dateB - dateA;
      
      // 2. Depois por álbum (alfabético)
      const albumComparison = a.album.localeCompare(b.album);
      if (albumComparison !== 0) return albumComparison;
      
      // 3. Depois por número do disco
      if (a.diskNumber !== b.diskNumber) return a.diskNumber - b.diskNumber;
      
      // 4. Por último por posição da faixa
      return a.trackPosition - b.trackPosition;
    });
  } catch (error) {
    console.error('Error getting saved music sorted by release:', error);
    return [];
  }
}

export async function updateMusicRating(firebaseId: string, rating: number): Promise<void> {
  try {
    const musicRef = doc(db, 'savedMusic', firebaseId);
    await updateDoc(musicRef, { rating });
    console.log('Rating updated successfully');
  } catch (error) {
    console.error('Error updating rating:', error);
    throw error;
  }
}

/**
 * Função helper para extrair a data de lançamento de uma track
 */
function getTrackReleaseDate(track: DeezerTrack): string | null {
  // Primeiro tenta a data do álbum
  if (track.album?.release_date) {
    return track.album.release_date;
  }
  
  // Depois tenta a data da própria track
  if (track.release_date) {
    return track.release_date;
  }
  
  return null;
}