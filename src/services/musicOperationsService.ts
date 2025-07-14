// src/services/musicOperationsService.ts
// Handles music operations like saving tracks and albums, showing dialogs, etc.
import { Alert } from 'react-native';
import { DeezerTrack, SavedMusic } from '../types/music';
import { saveMusic, saveMusicBatch } from './musicService';
import { useMusicStore } from '../store/musicStore';
import { DeezerService } from './deezerService';

export interface AlbumGroup {
  albumId: string;
  album: any;
  artist: any;
  tracks: DeezerTrack[];
  releaseDate: string;
}

export class MusicOperationsService {
  // === TRACK OPERATIONS ===
  static async saveTrack(track: DeezerTrack, rating: number): Promise<void> {
    if (!track?.id || !track?.title) {
      throw new Error('Invalid track data');
    }

    const store = useMusicStore.getState();
    
    if (store.isTrackSaving(track.id)) {
      throw new Error('Esta música já está sendo salva. Aguarde...');
    }

    try {
      store.startTrackSave(track.id);
      const firebaseId = await saveMusic(track, { rating });
      
      const savedMusic: SavedMusic = {
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
        releaseDate: DeezerService.getTrackReleaseDate(track) || '1900-01-01',
        trackPosition: track.track_position || 0,
        diskNumber: track.disk_number || 1,
        savedAt: new Date(),
        firebaseId,
      };
      
      store.addMusic(savedMusic);
      console.log(`✅ Track saved: ${track.title}`);
    } finally {
      store.finishTrackSave(track.id);
    }
  }

  // === ALBUM OPERATIONS ===
  static async saveAlbumTracks(
    albumGroup: AlbumGroup, 
    rating: number, 
    unsavedTracks: DeezerTrack[]
  ): Promise<string[]> {
    if (unsavedTracks.length === 0) {
      Alert.alert('Aviso', 'Todas as faixas já estão salvas na biblioteca.');
      return [];
    }

    const store = useMusicStore.getState();
    store.startAlbumSave(albumGroup.albumId);
    unsavedTracks.forEach(track => store.startTrackSave(track.id));

    try {
      const firebaseIds = await saveMusicBatch(unsavedTracks, rating);
      
      const savedMusics: SavedMusic[] = unsavedTracks.map((track, index) => ({
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
        releaseDate: DeezerService.getTrackReleaseDate(track) || '1900-01-01',
        trackPosition: track.track_position || 0,
        diskNumber: track.disk_number || 1,
        savedAt: new Date(),
        firebaseId: firebaseIds[index],
      })).filter((_, index) => firebaseIds[index]);

      store.addMusicBatch(savedMusics);
      console.log(`✅ Album saved: ${firebaseIds.length} tracks`);
      return firebaseIds;
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível salvar todas as faixas. Tente novamente.');
      console.error('Error saving album tracks:', error);
      throw error;
    } finally {
      store.finishAlbumSave(albumGroup.albumId);
      unsavedTracks.forEach(track => store.finishTrackSave(track.id));
    }
  }

  // === DIALOG HELPERS ===
  static showTrackDialog(
    track: DeezerTrack,
    savedMusicData: SavedMusic | null,
    onSaveWithoutRating: () => void,
    onSaveWithRating: () => void
  ): void {
    const releaseYear = track.album?.release_date ? 
      new Date(track.album.release_date).getFullYear() : 'Ano desconhecido';

    if (savedMusicData) {
      Alert.alert(
        '⚠️ Música já salva',
        `"${track.title}" já está na sua biblioteca com nota ${savedMusicData.rating === 0 ? 'sem nota' : savedMusicData.rating}.\n\nDeseja salvar novamente?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Salvar novamente', style: 'default', onPress: onSaveWithoutRating },
        ]
      );
    } else {
      Alert.alert(
        track.title,
        `Artista: ${track.artist.name}\nÁlbum: ${track.album.title}\nAno: ${releaseYear}`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Salvar sem nota', onPress: onSaveWithoutRating },
          { text: 'Avaliar e salvar', onPress: onSaveWithRating },
        ]
      );
    }
  }

  static showAlbumDialog(
    albumGroup: AlbumGroup,
    savedCount: number,
    unsavedCount: number,
    onSaveWithoutRating: () => void,
    onSaveWithRating: () => void
  ): void {
    if (unsavedCount === 0) {
      Alert.alert(
        'Álbum já salvo',
        `Todas as faixas de "${albumGroup.album.title}" já estão na sua biblioteca.`,
        [{ text: 'OK' }]
      );
      return;
    }

    let message = `Salvar ${albumGroup.tracks.length} faixas do álbum "${albumGroup.album.title}" de ${albumGroup.artist.name}?`;
    
    if (savedCount > 0) {
      message += `\n\n⚠️ ${savedCount} faixa(s) já estão salvas e serão ignoradas.`;
    }

    Alert.alert(
      'Salvar Álbum Completo',
      message,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Salvar sem nota', onPress: onSaveWithoutRating },
        { text: 'Avaliar e salvar', onPress: onSaveWithRating },
      ]
    );
  }

  static showRatingDialog(
    title: string,
    itemName: string,
    onSave: (rating: number) => void
  ): void {
    Alert.prompt(
      title,
      `Digite uma nota de 1 a 10 para "${itemName}"`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Salvar',
          onPress: (rating) => {
            const numRating = parseInt(rating || '0');
            
            if (numRating < 1 || numRating > 10) {
              Alert.alert('Erro', 'Por favor, digite uma nota entre 1 e 10');
              return;
            }

            onSave(numRating);
          },
        },
      ],
      'plain-text',
      '',
      'numeric'
    );
  }
}