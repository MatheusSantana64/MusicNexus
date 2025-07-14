// src/services/trackOperationsService.ts
// Track operations service for saving tracks, showing dialogs, and handling ratings
import { Alert } from 'react-native';
import { DeezerTrack, SavedMusic } from '../types/music';
import { MusicStoreService } from './musicStoreService';
import { ErrorHandlingService } from './errorHandlingService';

export class TrackOperationsService {
  private static readonly RATING_RANGE = { MIN: 1, MAX: 10 } as const;

  static showAlert(title: string, message: string): void {
    Alert.alert(title, message);
  }

  static async saveTrack(track: DeezerTrack, rating: number): Promise<void> {
    try {
      // Validate input
      if (!track?.id || !track?.title) {
        const error = ErrorHandlingService.handleValidationError(
          'Invalid track data provided',
          'TrackOperationsService.saveTrack'
        );
        ErrorHandlingService.handleError(error);
        return;
      }

      await MusicStoreService.saveTrack(track, rating);
      
      const message = rating === 0 
        ? `Música "${track.title}" salva sem nota!`
        : `Música "${track.title}" salva com nota ${rating}!`;
      
      this.showAlert('Sucesso!', message);
    } catch (originalError) {
      const error = ErrorHandlingService.handleNetworkError(
        originalError as Error,
        'TrackOperationsService.saveTrack'
      );
      ErrorHandlingService.handleError(error);
      throw error;
    }
  }

  static showRatingDialog(track: DeezerTrack, onSave: (rating: number) => void): void {
    Alert.prompt(
      'Avaliar Música',
      `Digite uma nota de ${this.RATING_RANGE.MIN} a ${this.RATING_RANGE.MAX} para "${track.title}"`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Salvar',
          onPress: (rating) => {
            try {
              const numRating = parseInt(rating || '0');
              
              if (numRating < this.RATING_RANGE.MIN || numRating > this.RATING_RANGE.MAX) {
                const error = ErrorHandlingService.handleValidationError(
                  `Rating must be between ${this.RATING_RANGE.MIN} and ${this.RATING_RANGE.MAX}`,
                  'TrackOperationsService.showRatingDialog'
                );
                this.showAlert('Erro', error.userMessage);
                return;
              }

              onSave(numRating);
            } catch (originalError) {
              const error = ErrorHandlingService.handleUnknownError(
                originalError,
                'TrackOperationsService.showRatingDialog'
              );
              ErrorHandlingService.handleError(error);
            }
          },
        },
      ],
      'plain-text',
      '',
      'numeric'
    );
  }

  static showTrackDialog(
    track: DeezerTrack,
    savedMusicData: SavedMusic | null,
    onSaveWithoutRating: () => void,
    onSaveWithRating: () => void
  ): void {
    try {
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
    } catch (originalError) {
      const error = ErrorHandlingService.handleUnknownError(
        originalError,
        'TrackOperationsService.showTrackDialog'
      );
      ErrorHandlingService.handleError(error);
    }
  }
}