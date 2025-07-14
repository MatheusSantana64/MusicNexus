// src/components/LibraryHeader.tsx
// Component for the header section of LibraryScreen with search and sort
import React from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { SavedMusic } from '../types/music';
import { libraryStyles as styles } from '../styles/screens/LibraryScreen.styles';

type SortMode = 'recent' | 'rating' | 'release' | 'alphabetical' | 'album' | 'artist';

const SORT_OPTIONS: Record<SortMode, { label: string; sortFn: (a: SavedMusic, b: SavedMusic) => number; reverseFn: (a: SavedMusic, b: SavedMusic) => number }> = {
  recent: {
    label: 'Added',
    sortFn: (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime(), // Newest first
    reverseFn: (a, b) => new Date(a.savedAt).getTime() - new Date(b.savedAt).getTime() // Oldest first
  },
  rating: {
    label: 'Rating',
    sortFn: (a, b) => b.rating - a.rating, // Highest first
    reverseFn: (a, b) => a.rating - b.rating // Lowest first
  },
  release: {
    label: 'Release',
    sortFn: (a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime(), // Newest first
    reverseFn: (a, b) => new Date(a.releaseDate).getTime() - new Date(b.releaseDate).getTime() // Oldest first
  },
  alphabetical: {
    label: 'Title',
    sortFn: (a, b) => a.title.localeCompare(b.title), // A-Z
    reverseFn: (a, b) => b.title.localeCompare(a.title) // Z-A
  },
  album: {
    label: 'Album',
    sortFn: (a, b) => a.album.localeCompare(b.album), // A-Z
    reverseFn: (a, b) => b.album.localeCompare(a.album) // Z-A
  },
  artist: {
    label: 'Artist',
    sortFn: (a, b) => a.artist.localeCompare(b.artist), // A-Z
    reverseFn: (a, b) => b.artist.localeCompare(a.artist) // Z-A
  },
};

interface LibraryHeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sortMode: SortMode;
  isReversed: boolean;
  onSortModeChange: (mode: SortMode, reversed?: boolean) => void;
  resultCount: number;
  totalCount: number;
}

export function LibraryHeader({
  searchQuery,
  onSearchChange,
  sortMode,
  isReversed,
  onSortModeChange,
  resultCount,
  totalCount,
}: LibraryHeaderProps) {
  const handleSortPress = (mode: SortMode) => {
    if (mode === sortMode) {
      // If clicking the same mode, toggle reverse
      onSortModeChange(mode, !isReversed);
    } else {
      // If clicking a different mode, start with normal order
      onSortModeChange(mode, false);
    }
  };

  const getSortIndicator = (mode: SortMode) => {
    if (mode !== sortMode) return '';
    
    // Different indicators based on sort type
    switch (mode) {
      case 'recent':
        return isReversed ? ' ↑' : ' ↓'; // Oldest/Newest
      case 'rating':
        return isReversed ? ' ↑' : ' ↓'; // Lowest/Highest
      case 'release':
        return isReversed ? ' ↑' : ' ↓'; // Oldest/Newest
      case 'alphabetical':
      case 'album':
      case 'artist':
        return isReversed ? ' ↓' : ' ↑'; // Z-A/A-Z
      default:
        return isReversed ? ' ↓' : ' ↑';
    }
  };

  return (
    <>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search in library..."
          placeholderTextColor={styles.placeholderText.color}
          value={searchQuery}
          onChangeText={onSearchChange}
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
      </View>
      
      <View style={styles.sortContainer}>
        <View style={styles.sortHeader}>
          <Text style={styles.sortLabel}>Sort by:</Text>
          {searchQuery.trim() && (
            <Text style={styles.resultCount}>
              {resultCount} of {totalCount} songs
            </Text>
          )}
        </View>
        <View style={styles.sortButtons}>
          {(Object.keys(SORT_OPTIONS) as SortMode[]).map((mode) => (
            <TouchableOpacity
              key={mode}
              style={[styles.sortButton, sortMode === mode && styles.sortButtonActive]}
              onPress={() => handleSortPress(mode)}
            >
              <Text style={[
                styles.sortButtonText,
                sortMode === mode && styles.sortButtonTextActive
              ]}>
                {SORT_OPTIONS[mode].label}{getSortIndicator(mode)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </>
  );
}

export { SORT_OPTIONS };
export type { SortMode };