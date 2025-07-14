// src/components/MusicItem.tsx
// MusicItem component for displaying music tracks in the app
import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { DeezerTrack, SavedMusic } from '../types/music';
import { DeezerService } from '../services/deezerService';
import { formatReleaseDate } from '../utils/dateUtils';
import { useMusicStore } from '../store/musicStore';
import { useOperationsStore } from '../store/operationsStore';
import { musicItemStyles as styles } from '../styles/components/MusicItem.styles';

// Use generic types for better type safety
interface MusicItemProps<T extends DeezerTrack | SavedMusic> {
  music: T;
  onPress: (music: T) => void;
  onLongPress?: (music: T) => void;
  isLoading?: boolean;
}

export function MusicItem<T extends DeezerTrack | SavedMusic>({ 
  music, 
  onPress, 
  onLongPress,
  isLoading = false,
}: MusicItemProps<T>) {
  const { getSavedMusicById } = useMusicStore();
  
  // ✨ Add global operation awareness
  const { isTrackSaving, isRatingUpdating, isMusicDeleting } = useOperationsStore();
  
  // Type guard to check if it's SavedMusic
  const isSavedMusic = (item: DeezerTrack | SavedMusic): item is SavedMusic => {
    return 'rating' in item && 'savedAt' in item;
  };

  // ✨ Calculate if any operation is in progress for this item
  const isOperationInProgress = () => {
    if (isLoading) return true;
    
    // Check track save operation
    if (isTrackSaving(music.id)) return true;
    
    // Check rating/delete operations (only for SavedMusic)
    if (isSavedMusic(music)) {
      const firebaseId = music.firebaseId;
      if (firebaseId && (isRatingUpdating(firebaseId) || isMusicDeleting(firebaseId))) {
        return true;
      }
    }
    
    return false;
  };

  // Extract common data regardless of type
  const getCommonData = () => {
    const savedMusicData = getSavedMusicById(music.id);
    
    if (isSavedMusic(music)) {
      // Se é SavedMusic, usar dados salvos
      return {
        id: music.id,
        title: music.title,
        artist: music.artist,
        album: music.album,
        coverUrl: music.coverUrl,
        duration: music.duration,
        releaseDate: music.releaseDate,
        trackPosition: music.trackPosition > 0 ? music.trackPosition.toString() : null,
        rating: music.rating,
        savedAt: music.savedAt,
        isSaved: true,
      };
    } else {
      // Se é DeezerTrack, verificar se já está salva e usar dados salvos se existir
      if (savedMusicData) {
        return {
          id: music.id,
          title: music.title,
          artist: music.artist.name,
          album: music.album.title,
          coverUrl: music.album.cover_medium,
          duration: music.duration,
          releaseDate: DeezerService.getTrackReleaseDate(music),
          trackPosition: DeezerService.getTrackPosition(music),
          rating: savedMusicData.rating, // ← Usar nota salva
          savedAt: savedMusicData.savedAt, // ← Usar data salva
          isSaved: true,
        };
      } else {
        return {
          id: music.id,
          title: music.title,
          artist: music.artist.name,
          album: music.album.title,
          coverUrl: music.album.cover_medium,
          duration: music.duration,
          releaseDate: DeezerService.getTrackReleaseDate(music),
          trackPosition: DeezerService.getTrackPosition(music),
          rating: null, // ← Sem nota
          savedAt: null, // ← Não salva
          isSaved: false,
        };
      }
    }
  };

  const data = getCommonData();

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
    if (rating === 0) return '#6c757d';
    if (rating <= 3) return '#dc3545';
    if (rating <= 6) return '#fd7e14';
    if (rating <= 8) return '#20c997';
    return '#28a745';
  };

  const getRatingText = (rating: number): string => {
    if (rating === 0) return 'N/A';
    return rating.toString();
  };

  const handleLongPress = () => {
    if (onLongPress) {
      onLongPress(music);
    } else {
      // Default long press behavior
      Alert.alert(
        data.title,
        `Artista: ${data.artist}\nÁlbum: ${data.album}\nRelease: ${data.releaseDate ? formatReleaseDate(data.releaseDate) : 'N/A'}${data.isSaved ? `\nSalva em: ${data.savedAt ? formatSavedDate(data.savedAt) : 'N/A'}` : '\nNão salva na biblioteca'}`,
        [
          { text: 'Fechar', style: 'cancel' },
        ]
      );
    }
  };

  return (
    <TouchableOpacity
      style={[styles.container, isOperationInProgress() && { opacity: 0.6 }]} // ✨ Updated
      onPress={() => !isOperationInProgress() && onPress(music)} // ✨ Updated
      onLongPress={handleLongPress}
      activeOpacity={isOperationInProgress() ? 1 : 0.7} // ✨ Updated
      disabled={isOperationInProgress()} // ✨ Updated
    >
      <Image
        source={{ uri: data.coverUrl }}
        style={styles.albumCover}
        defaultSource={require('../../assets/icon.png')}
      />
      
      <View style={styles.contentContainer}>
        <View style={styles.musicInfo}>
          <View style={styles.titleRow}>
            {data.trackPosition && (
              <Text style={styles.trackNumber}>{data.trackPosition}. </Text>
            )}
            <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
              {data.title}
            </Text>
            <Text style={styles.duration}>
              ({formatDuration(data.duration)})
            </Text>
          </View>
          
          <Text style={styles.artist} numberOfLines={1} ellipsizeMode="tail">
            {data.artist}<Text style={styles.album}> - {data.album}</Text>
          </Text>
          
          {data.releaseDate && (
            <Text style={styles.releaseDate}>
              {formatReleaseDate(data.releaseDate)}
            </Text>
          )}
          
          {data.savedAt && (
            <Text style={styles.savedDate} numberOfLines={1} ellipsizeMode="tail">
              Added {formatSavedDate(data.savedAt)}
            </Text>
          )}
        </View>
        
        <View style={styles.ratingSection}>
          {data.rating !== null && (
            <View style={[
              styles.ratingContainer,
              { backgroundColor: getRatingColor(data.rating) + '20' }
            ]}>
              <Text style={[
                styles.rating,
                { color: getRatingColor(data.rating) }
              ]}>
                {getRatingText(data.rating)}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}