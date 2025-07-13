import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SavedMusic } from '../types/music';
import { DeezerService } from '../services/deezerService';
import { formatReleaseDate } from '../utils/dateUtils'; // Add this import

interface SavedMusicItemProps {
  music: SavedMusic;
  onUpdateRating: (music: SavedMusic) => void;
  onDelete: (music: SavedMusic) => void;
}

export function SavedMusicItem({ music, onUpdateRating, onDelete }: SavedMusicItemProps) {
  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatSavedDate = (date: Date): string => {
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getRatingColor = (rating: number): string => {
    if (rating === 0) return '#6c757d'; // Cinza para sem nota
    if (rating <= 3) return '#dc3545'; // Vermelho para notas baixas
    if (rating <= 6) return '#fd7e14'; // Laranja para notas médias
    if (rating <= 8) return '#20c997'; // Verde para notas boas
    return '#28a745'; // Verde escuro para notas excelentes
  };

  const getRatingText = (rating: number): string => {
    if (rating === 0) return 'Sem nota';
    return rating.toString();
  };

  const handleLongPress = () => {
    Alert.alert(
      music.title,
      `Artista: ${music.artist}\nÁlbum: ${music.album}\nRelease: ${formatReleaseDate(music.releaseDate)}\nSalva em: ${formatSavedDate(music.savedAt)}`,
      [
        { text: 'Fechar', style: 'cancel' },
        { text: 'Avaliar', onPress: () => onUpdateRating(music) },
        { text: 'Remover', style: 'destructive', onPress: () => onDelete(music) },
      ]
    );
  };

  const releaseYear = music.releaseDate ? 
    new Date(music.releaseDate).getFullYear() : null;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onUpdateRating(music)}
      onLongPress={handleLongPress}
      activeOpacity={0.7}
    >
      <Image
        source={{ uri: music.coverUrl }}
        style={styles.albumCover}
        defaultSource={require('../../assets/icon.png')}
      />
      
      <View style={styles.musicInfo}>
        <View style={styles.titleRow}>
          {music.trackPosition > 0 && (
            <Text style={styles.trackNumber}>{music.trackPosition}. </Text>
          )}
          <Text style={styles.title} numberOfLines={2}>
            {music.title}
          </Text>
        </View>
        
        <Text style={styles.artist} numberOfLines={1}>
          {music.artist}
        </Text>
        
        <View style={styles.albumRow}>
          <Text style={styles.album} numberOfLines={1}>
            {music.album}
          </Text>
        </View>
        
        {music.releaseDate && (
          <Text style={styles.releaseDate}>
            {formatReleaseDate(music.releaseDate)}
          </Text>
        )}
      </View>
      
      <View style={styles.rightInfo}>
        <View style={[
          styles.ratingContainer,
          { backgroundColor: getRatingColor(music.rating) + '20' }
        ]}>
          <Text style={[
            styles.rating,
            { color: getRatingColor(music.rating) }
          ]}>
            {getRatingText(music.rating)}
          </Text>
        </View>
        
        <Text style={styles.duration}>
          {formatDuration(music.duration)}
        </Text>
        
        <Text style={styles.savedDate}>
          Added {formatSavedDate(music.savedAt)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    alignItems: 'center',
  },
  albumCover: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  musicInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  trackNumber: {
    fontSize: 14,
    fontWeight: '500',
    color: '#007AFF',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  artist: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  albumRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  album: {
    fontSize: 12,
    color: '#999',
    flex: 1,
  },
  year: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
    marginLeft: 4,
  },
  savedDate: {
    fontSize: 11,
    color: '#aaa',
    fontStyle: 'italic',
  },
  rightInfo: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    minWidth: 60,
  },
  ratingContainer: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
    minWidth: 50,
    alignItems: 'center',
  },
  rating: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  duration: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2,
  },
  source: {
    fontSize: 10,
    color: '#666',
    fontWeight: '500',
  },
  releaseDate: {
    fontSize: 11,
    color: '#28a745',
    marginBottom: 2,
    fontWeight: '500',
  },
});
