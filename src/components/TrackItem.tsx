import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { DeezerTrack } from '../types/music';
import { DeezerService } from '../services/deezerService';

interface TrackItemProps {
  track: DeezerTrack;
  onPress: (track: DeezerTrack) => void;
  isLoading?: boolean;
}

export function TrackItem({ track, onPress, isLoading = false }: TrackItemProps) {
  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const releaseYear = DeezerService.getReleaseYear(track);
  const releaseDate = DeezerService.getTrackReleaseDatePublic(track);
  const trackPosition = DeezerService.getTrackPosition(track);
  
  // Debug: Log para ver se os dados estão sendo obtidos
  console.log(`Track: ${track.title} | Album: ${track.album?.title} | Date: ${track.album?.release_date} | Position: ${track.track_position} | Year: ${releaseYear}`);

  return (
    <TouchableOpacity
      style={[styles.container, isLoading && styles.containerLoading]}
      onPress={() => !isLoading && onPress(track)}
      activeOpacity={isLoading ? 1 : 0.7}
      disabled={isLoading}
    >
      <Image
        source={{ uri: track.album.cover_medium }}
        style={styles.albumCover}
        defaultSource={require('../../assets/icon.png')}
      />
      
      <View style={styles.trackInfo}>
        <Text style={styles.title} numberOfLines={2}>
          {trackPosition && (
            <Text style={styles.trackNumber}>{trackPosition}. </Text>
          )}
          {track.title}
        </Text>
        <Text style={styles.artist} numberOfLines={1}>
          {track.artist.name}
        </Text>
        <View style={styles.albumRow}>
          <Text style={styles.album} numberOfLines={1}>
            {track.album.title}
          </Text>
          {releaseYear && (
            <Text style={styles.year}>
              • {releaseYear}
            </Text>
          )}
        </View>
        {/* Debug: Mostrar a data completa temporariamente */}
        {releaseDate && (
          <Text style={styles.debugDate}>
            {DeezerService.formatReleaseDate(releaseDate)}
          </Text>
        )}
      </View>
      
      <View style={styles.rightInfo}>
        {isLoading ? (
          <ActivityIndicator size="small" color="#007AFF" />
        ) : (
          <Text style={styles.duration}>
            {formatDuration(track.duration)}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    alignItems: 'center',
  },
  containerLoading: {
    opacity: 0.6,
  },
  albumCover: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  trackInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  trackNumber: {
    fontSize: 14,
    fontWeight: '500',
    color: '#007AFF',
  },
  artist: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  albumRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
  debugDate: {
    fontSize: 10,
    color: '#28a745',
    marginTop: 2,
  },
  rightInfo: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    minWidth: 40,
  },
  duration: {
    fontSize: 12,
    color: '#999',
  },
});