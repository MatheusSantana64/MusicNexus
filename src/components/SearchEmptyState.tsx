// src/components/SearchEmptyState.tsx
// Component for displaying empty state in the SearchScreen
import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { SearchMode } from '../types/music';
import { searchStyles as styles } from '../styles/screens/SearchScreen.styles';

interface SearchEmptyStateProps {
  loading: boolean;
  error: string | null;
  searchQuery: string;
  tracksLength: number;
  searchMode: SearchMode;
}

export function SearchEmptyState({ loading, error, searchQuery, tracksLength, searchMode }: SearchEmptyStateProps) {
  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>
          {searchMode === 'album' ? 'Searching albums...' : 'Quick search...'}
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
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyText}>
          Type the name of a song, artist, or album to search
        </Text>
        <Text style={styles.hintText}>
          💡 Use the filters above to choose the search type
        </Text>
      </View>
    );
  }

  if (tracksLength === 0 && searchQuery.length > 2) {
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