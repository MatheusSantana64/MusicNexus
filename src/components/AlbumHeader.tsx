// src/components/AlbumHeader.tsx
// Defines the AlbumHeader component which displays album information
import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { DeezerTrack } from '../types/music';
import { searchStyles as styles } from '../styles/screens/SearchScreen.styles';

export interface AlbumGroup {
  albumId: string;
  album: any;
  artist: any;
  tracks: DeezerTrack[];
  releaseDate: string;
}

interface AlbumHeaderProps {
  albumGroup: AlbumGroup;
  savedCount: number;
  totalCount: number;
  isLoading: boolean;
  onSaveAlbum: (albumGroup: AlbumGroup) => void;
}

export function AlbumHeader({ 
  albumGroup, 
  savedCount, 
  totalCount, 
  isLoading, 
  onSaveAlbum 
}: AlbumHeaderProps) {
  const { album, artist } = albumGroup;
  
  return (
    <View style={styles.albumHeader}>
      <View style={styles.albumInfo}>
        <Text style={styles.albumTitle} numberOfLines={1}>
          💿 {album.title}
        </Text>
        <Text style={styles.albumArtist} numberOfLines={1}>
          {artist.name} • {totalCount} faixas
          {savedCount > 0 && (
            <Text style={styles.savedCount}> • {savedCount} salvas</Text>
          )}
        </Text>
      </View>
      <TouchableOpacity
        style={[styles.saveAlbumButton, isLoading && styles.saveAlbumButtonLoading]}
        onPress={() => !isLoading && onSaveAlbum(albumGroup)}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text style={styles.saveAlbumButtonText}>
            {savedCount === totalCount ? 'Salvo' : 'Salvar Álbum'}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}