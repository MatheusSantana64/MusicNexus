// src/components/LibraryHeader.tsx
// Component for the header section of LibraryScreen with search and sort
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { SavedMusic } from '../types/music';
import { libraryStyles as styles } from '../styles/screens/LibraryScreen.styles';
import { LibrarySortingUtils } from '../utils/librarySortingUtils';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../styles/theme';

type SortMode = 'added' | 'rating' | 'release' | 'alphabetical' | 'album' | 'artist';

// Create the SORT_OPTIONS using the new utility
const SORT_OPTIONS: Record<SortMode, { icon: keyof typeof Ionicons.glyphMap; label: string; sortFn: (a: SavedMusic, b: SavedMusic) => number; reverseFn: (a: SavedMusic, b: SavedMusic) => number }> = {
  release: {
    icon: 'calendar-number-outline',
    label: 'Release',
    sortFn: LibrarySortingUtils.createSortFunction('release', false),
    reverseFn: LibrarySortingUtils.createSortFunction('release', true)
  },
  rating: {
    icon: 'star-half-outline',
    label: 'Rating',
    sortFn: LibrarySortingUtils.createSortFunction('rating', false),
    reverseFn: LibrarySortingUtils.createSortFunction('rating', true)
  },
  added: {
    icon: 'save-outline',
    label: 'Added',
    sortFn: LibrarySortingUtils.createSortFunction('added', false),
    reverseFn: LibrarySortingUtils.createSortFunction('added', true)
  },
  alphabetical: {
    icon: 'text-outline',
    label: 'Title',
    sortFn: LibrarySortingUtils.createSortFunction('alphabetical', false),
    reverseFn: LibrarySortingUtils.createSortFunction('alphabetical', true)
  },
  album: {
    icon: 'disc-sharp',
    label: 'Album',
    sortFn: LibrarySortingUtils.createSortFunction('album', false),
    reverseFn: LibrarySortingUtils.createSortFunction('album', true)
  },
  artist: {
    icon: 'mic-outline',
    label: 'Artist',
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
  const [showSortOptions, setShowSortOptions] = useState(false);

  const handleSortPress = (mode: SortMode) => {
    if (mode === sortMode) {
      onSortModeChange(mode, !isReversed);
    } else {
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
      <View style={[styles.searchContainer, { position: 'relative' }]}>
        <TextInput
          style={[styles.searchInput, { paddingRight: 48 }]} // Right padding so text doesn't go under the X
          placeholder="Search in library..."
          placeholderTextColor={styles.placeholderText.color}
          value={searchQuery}
          onChangeText={onSearchChange}
          autoCorrect={false}
          clearButtonMode="never"
        />
        {/* Clear button (X) */}
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => onSearchChange('')}
            style={{
              position: 'absolute',
              right: 32,
              top: 0,
              bottom: 4,
              justifyContent: 'center',
              paddingHorizontal: 4,
              paddingVertical: 4,
            }}
            accessibilityLabel="Clear search"
          >
            <Text style={{ fontSize: 18, color: theme.colors.textSecondary }}>✕</Text>
          </TouchableOpacity>
        )}
      </View>
      
      <View style={styles.sortContainer}>
        <View style={styles.sortHeader}>
          <TouchableOpacity
            onPress={() => setShowSortOptions((v) => !v)}
            style={[
              styles.sortLabelButton,
              showSortOptions && { backgroundColor: theme.colors.primary }
            ]}
          >
            <Text style={styles.sortLabel}>
              Sort by {SORT_OPTIONS[sortMode].label}{getSortIndicator(sortMode)}
            </Text>
          </TouchableOpacity>
          {searchQuery.trim() && (
            <Text style={styles.resultCount}>
              {resultCount} of {totalCount} songs
            </Text>
          )}
        </View>
        {showSortOptions && (
          <View style={styles.sortButtons}>
            {(Object.keys(SORT_OPTIONS) as SortMode[]).map((mode) => (
              <TouchableOpacity
                key={mode}
                style={[styles.sortButton, sortMode === mode && styles.sortButtonActive]}
                onPress={() => handleSortPress(mode)}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons
                    name={SORT_OPTIONS[mode].icon}
                    size={20}
                    color={sortMode === mode ? theme.colors.textPrimary : theme.colors.textMuted}
                  />
                  {sortMode === mode && (
                    <Ionicons
                      name={isReversed ? 'arrow-down' : 'arrow-up'}
                      size={16}
                      color={theme.colors.textPrimary}
                      style={{ marginLeft: 4 }}
                    />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </>
  );
}

export { SORT_OPTIONS };
export type { SortMode };