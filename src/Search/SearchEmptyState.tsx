// src/components/SearchEmptyState.tsx
// Component for displaying empty state in the SearchScreen
import React from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SearchMode } from '../types';
import { searchStyles as styles } from './styles/SearchScreen.styles';

interface SearchEmptyStateProps {
  loading: boolean;
  error: string | null;
  searchQuery: string;
  tracksLength: number;
  searchMode: SearchMode;
  onImportPlaylist?: () => void;
  hasSearched?: boolean; // <-- Add this
}

export function SearchEmptyState({ loading, error, searchQuery, tracksLength, searchMode, onImportPlaylist, hasSearched }: SearchEmptyStateProps) {
  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>
          {(searchMode === 'spotify_album' || searchMode === 'deezer_album')
            ? 'Searching albums...'
            : 'Quick search...'}
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (searchQuery.length === 0) {
    let instructions: React.ReactNode = null;

    switch (searchMode) {
      case 'spotify_album':
        instructions = (
          <Text style={styles.hintText}>
            <Text style={{ fontWeight: 'bold', color: '#1DB954' }}>Spotify Album Search:</Text> 
            {'\n'}Find albums on Spotify by artist or album.
            {'\n\n'}TIP: To search for both an artist and a specific album together, format your search as:{'\n'} 
            <Text>Artist Name - Album Title</Text>.
            {'\n'}Example: <Text>BLACKPINK - SQUARE UP</Text>
            {'\n'}This will search for the album by "BLACKPINK" with the title "SQUARE UP".
          </Text>
        );
        break;
      case 'spotify_quick':
        instructions = (
          <Text style={styles.hintText}>
            <Text style={{ fontWeight: 'bold', color: '#1DB954' }}>Spotify Quick Search:</Text> 
            {'\n'}Find individual songs on Spotify by typing the song or artist name.
          </Text>
        );
        break;
      case 'deezer_album':
        instructions = (
          <Text style={styles.hintText}>
            <Text style={{ fontWeight: 'bold', color: '#7c3aed' }}>Deezer Album Search:</Text> 
            {'\n'}Find albums on Deezer by artist or album.
            {'\n\n'}TIP: To search for both an artist and a specific album together, format your search as:{'\n'} 
            <Text>Artist Name - Album Title</Text>.
            {'\n'}Example: <Text>BLACKPINK - SQUARE UP</Text>
            {'\n'}This will search for the album by "BLACKPINK" with the title "SQUARE UP".          </Text>
        );
        break;
      case 'deezer_quick':
        instructions = (
          <Text style={styles.hintText}>
            <Text style={{ fontWeight: 'bold', color: '#7c3aed' }}>Deezer Quick Search:</Text> 
            {'\n'}Find individual songs on Deezer by typing the song or artist name.
          </Text>
        );
        break;
      default:
        instructions = (
          <Text style={styles.hintText}>
            Select a search type above to see instructions.
          </Text>
        );
    }

    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyText}>Use the filters above to choose the search type</Text>
        <View style={{ marginVertical: 12 }}>
          {instructions}
        </View>
        <TouchableOpacity style={styles.importButton} onPress={onImportPlaylist}>
          <Text style={styles.importButtonText}>Import Playlist from Deezer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!loading && hasSearched && tracksLength === 0 && searchQuery.length > 2) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyText}>
          No results found for "{searchQuery}"
        </Text>
        <Text style={styles.hintText}>
          Try changing the search mode or using different terms
        </Text>
      </View>
    );
  }

  return null;
}