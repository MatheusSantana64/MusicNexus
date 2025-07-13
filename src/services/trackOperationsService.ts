import { Alert } from 'react-native';
import { DeezerTrack, SavedMusic } from '../types/music';
import { saveMusic } from './musicService';

export class TrackOperationsService {
  private static readonly RATING_RANGE = { MIN: 1, MAX: 10 } as const;

  static showAlert(title: string, message: string): void {
    Alert.alert(title, message);
  }

  static async saveTrack(track: DeezerTrack, rating: number): Promise<void> {
    try {
      await saveMusic(track, { rating });
      
      const message = rating === 0 
        ? `Música "${track.title}" salva sem nota!`
        : `Música "${track.title}" salva com nota ${rating}!`;
      
      this.showAlert('Sucesso!', message);
    } catch (error) {
      this.showAlert('Erro', 'Não foi possível salvar a música. Tente novamente.');
      console.error('Error saving music:', error);
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

  static showSaveOptionsDialog(track: DeezerTrack, onSaveWithoutRating: () => void, onSaveWithRating: () => void): void {
    Alert.alert(
      'Salvar novamente',
      `Como deseja salvar "${track.title}" novamente?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Salvar sem nota', onPress: onSaveWithoutRating },
        { text: 'Avaliar e salvar', onPress: onSaveWithRating },
      ]
    );
  }
}