// src/components/AlbumHeader.tsx
// Defines the AlbumHeader component which displays album information
import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MusicTrack } from '../types';
import { useMusicStore } from '../store/musicStore';
import { searchStyles as styles } from './styles/SearchScreen.styles';
import { theme } from '../styles/theme';

export interface AlbumGroup {
  albumId: string;
  album: any;
  artist: any;
  tracks: MusicTrack[];
  releaseDate: string;
}

interface AlbumHeaderProps {
  albumGroup: AlbumGroup;
  totalCount: number;
  savedCount: number;
  isLoading: boolean;
  onSaveAlbum: (albumGroup: AlbumGroup) => void;
}

export function AlbumHeader({ 
  albumGroup, 
  totalCount, 
  isLoading, 
  onSaveAlbum 
}: AlbumHeaderProps) {
  const { album, artist } = albumGroup;
  const { isMusicSaved } = useMusicStore();
  
  // Calculate saved count dynamically from the store
  const savedCount = albumGroup.tracks.filter(track => isMusicSaved(track.id)).length;
  const isFullySaved = savedCount === totalCount;
  
  return (
    <View style={styles.albumHeader}>
      <View style={styles.albumInfo}>
        <Text style={styles.albumTitle} numberOfLines={1}>
          💿 {album.title}
        </Text>
        <Text style={styles.albumArtist} numberOfLines={1}>
          {artist.name} • {totalCount} tracks
          {savedCount > 0 && (
            <Text style={styles.savedCount}> • {savedCount} saved</Text>
          )}
        </Text>
      </View>
      <TouchableOpacity
        style={[styles.saveAlbumButton, isFullySaved ? { backgroundColor: theme.colors.button.success } : {}, isLoading && styles.saveAlbumButtonLoading]}
        onPress={() => !isLoading && onSaveAlbum(albumGroup)}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color={theme.colors.text.primary} />
        ) : (
          <Text style={styles.saveAlbumButtonText}>
            {isFullySaved ? 'Saved' : 'Save'}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}