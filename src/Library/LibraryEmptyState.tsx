// src/components/LibraryEmptyState.tsx
// Component for displaying empty states in the LibraryScreen
import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { libraryStyles as styles } from './styles/LibraryScreen.styles';

interface LibraryEmptyStateProps {
  loading: boolean;
  error: string | null;
  searchQuery: string;
  savedMusicLength: number;
  processedMusicLength: number;
  onRetry: () => void;
  onClearSearch: () => void;
}

export function LibraryEmptyState({
  loading,
  error,
  searchQuery,
  savedMusicLength,
  processedMusicLength,
  onRetry,
  onClearSearch,
}: LibraryEmptyStateProps) {
  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading library...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
          <Text style={styles.retryButtonText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (savedMusicLength === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyTitle}>🎵 Empty Library</Text>
        <Text style={styles.emptyText}>
          You haven't saved any songs yet.{'\n'}
          Go to the search tab and start adding your favorite songs!
        </Text>
      </View>
    );
  }

  if (searchQuery.trim() && processedMusicLength === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyTitle}>🔍 No Results Found</Text>
        <Text style={styles.emptyText}>
          We couldn't find any songs matching "{searchQuery}".{'\n'}
          Try searching by title, artist, or album.
        </Text>
        <TouchableOpacity style={styles.clearSearchButton} onPress={onClearSearch}>
          <Text style={styles.clearSearchButtonText}>Clear Search</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return null;
}