// src/services/albumOperationsService.ts
// Service for album operations like saving albums and tracks
import { Alert } from 'react-native';
import { DeezerTrack } from '../types/music';
import { MusicStoreService } from './musicStoreService';

export interface AlbumGroup {
  albumId: string;
  album: any;
  artist: any;
  tracks: DeezerTrack[];
  releaseDate: string;
}

export class AlbumOperationsService {
  private static readonly RATING_RANGE = { MIN: 1, MAX: 10 } as const;

  static showAlert(title: string, message: string): void {
    Alert.alert(title, message);
  }

  static async saveAlbumTracks(
    albumGroup: AlbumGroup, 
    rating: number, 
    unsavedTracks: DeezerTrack[]
  ): Promise<string[]> {
    if (unsavedTracks.length === 0) {
      this.showAlert('Aviso', 'Todas as faixas já estão salvas na biblioteca.');
      return [];
    }

    try {
      // ✨ Use smart service instead of direct saveMusicBatch
      const savedIds = await MusicStoreService.saveTracksBatch(unsavedTracks, rating);
      
      const message = rating === 0 
        ? `${savedIds.length} faixas salvas sem nota!`
        : `${savedIds.length} faixas salvas com nota ${rating}!`;
      
      this.showAlert('Sucesso!', message);
      return savedIds;
    } catch (error) {
      this.showAlert('Erro', 'Não foi possível salvar todas as faixas. Tente novamente.');
      console.error('Error saving album tracks:', error);
      throw error;
    }
  }

  static showRatingDialog(
    albumGroup: AlbumGroup, 
    onSave: (rating: number) => void
  ): void {
    Alert.prompt(
      'Avaliar Álbum',
      `Digite uma nota de ${this.RATING_RANGE.MIN} a ${this.RATING_RANGE.MAX} para todas as faixas de "${albumGroup.album.title}"`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Salvar',
          onPress: (rating) => {
            const numRating = parseInt(rating || '0');
            
            if (numRating < this.RATING_RANGE.MIN || numRating > this.RATING_RANGE.MAX) {
              this.showAlert('Erro', `Por favor, digite uma nota entre ${this.RATING_RANGE.MIN} e ${this.RATING_RANGE.MAX}`);
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

  static showSaveAlbumDialog(
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
        [{ text: 'OK', style: 'default' }]
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
}