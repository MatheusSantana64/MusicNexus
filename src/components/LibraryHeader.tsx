// src/components/LibraryHeader.tsx
// Component for the header section of LibraryScreen with search and sort
import React from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { SavedMusic } from '../types/music';
import { libraryStyles as styles } from '../styles/screens/LibraryScreen.styles';
import { LibrarySortingUtils } from '../utils/librarySortingUtils';

type SortMode = 'added' | 'rating' | 'release' | 'alphabetical' | 'album' | 'artist';

// Create the SORT_OPTIONS using the new utility
const SORT_OPTIONS: Record<SortMode, { label: string; sortFn: (a: SavedMusic, b: SavedMusic) => number; reverseFn: (a: SavedMusic, b: SavedMusic) => number }> = {
  release: {
    label: '🗓️',
    sortFn: LibrarySortingUtils.createSortFunction('release', false),
    reverseFn: LibrarySortingUtils.createSortFunction('release', true)
  },
  rating: {
    label: '⭐',
    sortFn: LibrarySortingUtils.createSortFunction('rating', false),
    reverseFn: LibrarySortingUtils.createSortFunction('rating', true)
  },
  added: {
    label: '💾',
    sortFn: LibrarySortingUtils.createSortFunction('added', false),
    reverseFn: LibrarySortingUtils.createSortFunction('added', true)
  },
  alphabetical: {
    label: '🔠',
    sortFn: LibrarySortingUtils.createSortFunction('alphabetical', false),
    reverseFn: LibrarySortingUtils.createSortFunction('alphabetical', true)
  },
  album: {
    label: '💿',
    sortFn: LibrarySortingUtils.createSortFunction('album', false),
    reverseFn: LibrarySortingUtils.createSortFunction('album', true)
  },
  artist: {
    label: '🎤',
    sortFn: LibrarySortingUtils.createSortFunction('artist', false),
    reverseFn: LibrarySortingUtils.createSortFunction('artist', true)
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
      case 'added':
      case 'release':
        return isReversed ? ' (Oldest)' : ' (Newest)'; // Oldest/Newest
      case 'rating':
        return isReversed ? ' (Lowest)' : ' (Highest)'; // Lowest/Highest
      case 'alphabetical':
      case 'album':
      case 'artist':
        return isReversed ? ' (Z-A)' : ' (A-Z)'; // Z-A/A-Z
      default:
        return isReversed ? ' (↓)' : ' (↑)';
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