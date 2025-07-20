// src/components/MusicItem.tsx
// MusicItem component for displaying music tracks in the app
import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { MusicTrack, SavedMusic } from '../types';
import { MusicSearchService } from '../services/music/musicSearchService';
import { formatReleaseDate } from '../utils/dateUtils';
import { useMusicStore } from '../store/musicStore';
import { musicItemStyles as styles } from './styles/MusicItem.styles';
import { getRatingColor, getRatingText } from '../utils/ratingUtils';
import { Tag } from '../types/tag'; // Import Tag type

// Use generic types for better type safety
interface MusicItemProps<T extends MusicTrack | SavedMusic> {
  music: T;
  onPress: (music: T) => void;
  onLongPress?: (music: T) => void;
  isLoading?: boolean;
  showInfoModal?: (title: string, message: string) => void;
  tags?: Tag[];
}

export function MusicItem<T extends MusicTrack | SavedMusic>({
  music,
  onPress,
  onLongPress,
  isLoading = false,
  showInfoModal,
  tags = [],
}: MusicItemProps<T>) {
  const { 
    getSavedMusicById, 
    isTrackSaving, 
    isRatingUpdating, 
    isMusicDeleting 
  } = useMusicStore();
  
  const isSavedMusic = (item: MusicTrack | SavedMusic): item is SavedMusic => {
    return 'rating' in item && 'savedAt' in item;
  };

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

  const getCommonData = () => {
    const savedMusicData = getSavedMusicById(music.id);
    
    if (isSavedMusic(music)) {
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
      if (savedMusicData) {
        return {
          id: music.id,
          title: music.title,
          artist: music.artist.name,
          album: music.album.title,
          coverUrl: music.album.cover_medium,
          duration: music.duration,
          releaseDate: MusicSearchService.getTrackReleaseDate(music),
          trackPosition: MusicSearchService.getTrackPosition(music),
          rating: savedMusicData.rating,
          savedAt: savedMusicData.savedAt,
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
          releaseDate: MusicSearchService.getTrackReleaseDate(music),
          trackPosition: MusicSearchService.getTrackPosition(music),
          rating: null,
          savedAt: null,
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

  const handleLongPress = () => {
    if (onLongPress) {
      onLongPress(music);
    } else if (showInfoModal) {
      // Use the modal instead of Alert
      const message = `Artist: ${data.artist}\nAlbum: ${data.album}\nRelease: ${data.releaseDate ? formatReleaseDate(data.releaseDate) : 'N/A'}${data.isSaved ? `\nSaved on: ${data.savedAt ? formatSavedDate(data.savedAt) : 'N/A'}` : '\nNot saved in library'}`;
      showInfoModal(data.title, message);
    }
  };

  // Helper to get tags array (only for SavedMusic)
  const getTagIds = () => {
    if (isSavedMusic(music) && Array.isArray(music.tags)) {
      return music.tags;
    }
    return [];
  };

  // Helper to get tag objects for this music
  const getTagObjects = () => {
    const tagIds = getTagIds();
    if (tagIds.length > 0 && tags.length > 0) {
      return tagIds
        .map(tagId => tags.find(tag => tag.id === tagId))
        .filter((tag): tag is Tag => !!tag);
    }
    return [];
  };

  const tagObjects = getTagObjects();

  return (
    <TouchableOpacity
      style={[styles.container, isOperationInProgress() && { opacity: 0.6 }]}
      onPress={() => !isOperationInProgress() && onPress(music)}
      onLongPress={handleLongPress}
      activeOpacity={isOperationInProgress() ? 1 : 0.7}
      disabled={isOperationInProgress()}
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
          
          {/*data.savedAt && (
            <Text style={styles.savedDate} numberOfLines={1} ellipsizeMode="tail">
              Added {formatSavedDate(data.savedAt)}
            </Text>
          )*/}

          {/* --- TAGS SECTION --- */}
          {tagObjects.length > 0 && (
            <View style={styles.tagContainer}>
              {tagObjects.map(tag => (
                <View
                  key={tag.id}
                  style={[
                    styles.tagContainer,
                    { backgroundColor: tag.color }
                  ]}
                >
                  <Text style={styles.tagText}>
                    {tag.name}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
        
        {(isSavedMusic(music) || data.isSaved) && data.rating != null && data.rating !== undefined && (
          <View style={styles.ratingSection}>
            <View style={[styles.ratingContainer, { backgroundColor: getRatingColor(data.rating) + '20' }]}>
              <Text style={[styles.rating, { color: getRatingColor(data.rating) }]}>
                {getRatingText(data.rating)}
              </Text>
            </View>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}