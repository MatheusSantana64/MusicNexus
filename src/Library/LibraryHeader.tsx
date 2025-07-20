// src/components/LibraryHeader.tsx
// Component for the header section of LibraryScreen with search and sort
import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { SavedMusic, Tag } from '../types';
import { libraryStyles as styles } from './styles/LibraryScreen.styles';
import { LibrarySortingUtils } from '../utils/librarySortingUtils';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import MultiSlider from '@ptomasroos/react-native-multi-slider';

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
  ratingFilter?: [number, number];
  onRatingFilterChange?: (range: [number, number]) => void;
  tags: Tag[];
  selectedTagIds?: string[];
  onTagFilterChange?: (tagIds: string[]) => void;
  excludedTagIds?: string[];
  onExcludedTagChange?: (tagIds: string[]) => void;
  searchInputRef?: React.RefObject<TextInput | null>;
}

export function LibraryHeader({
  searchQuery,
  onSearchChange,
  sortMode,
  isReversed,
  onSortModeChange,
  resultCount,
  totalCount,
  ratingFilter = [0, 10],
  onRatingFilterChange,
  tags,
  selectedTagIds = [],
  onTagFilterChange,
  excludedTagIds = [],
  onExcludedTagChange,
  searchInputRef,
}: LibraryHeaderProps) {
  const [showSortOptions, setShowSortOptions] = useState(false);
  const [showRatingSlider, setShowRatingSlider] = useState(false);
  const [showTagsModal, setShowTagsModal] = useState(false);
  const [sliderValues, setSliderValues] = useState<[number, number]>(ratingFilter);
  const sliderValuesRef = useRef(sliderValues);

  // Keep ref in sync with state
  React.useEffect(() => {
    sliderValuesRef.current = sliderValues;
  }, [sliderValues]);

  // Only sync sliderValues from ratingFilter when slider is closed
  React.useEffect(() => {
    if (!showRatingSlider && (sliderValues[0] !== ratingFilter[0] || sliderValues[1] !== ratingFilter[1])) {
      setSliderValues(ratingFilter);
    }
  }, [ratingFilter, showRatingSlider]);

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

  // Rating button toggles slider and applies filter when hiding
  const handleRatingButton = () => {
    setShowRatingSlider((prev) => {
      if (prev && onRatingFilterChange) {
        onRatingFilterChange(sliderValuesRef.current);
      }
      return !prev;
    });
  };

  const isTagFilterActive = selectedTagIds.length > 0;

  const handleTagPress = (tagId: string) => {
    if (!onTagFilterChange || !onExcludedTagChange) return;
    if (selectedTagIds.includes(tagId)) {
      // Move to excluded
      onTagFilterChange(selectedTagIds.filter(id => id !== tagId));
      onExcludedTagChange([...excludedTagIds, tagId]);
    } else if (excludedTagIds.includes(tagId)) {
      // Remove from excluded
      onExcludedTagChange(excludedTagIds.filter(id => id !== tagId));
    } else {
      // Add to selected
      onTagFilterChange([...selectedTagIds, tagId]);
    }
  };

  return (
    <>
      {/* SEARCH BAR */}
      <View style={[styles.searchContainer, { position: 'relative' }]}>
        <TextInput
          ref={searchInputRef}
          style={[styles.searchInput, { paddingRight: 48 }]} // Right padding so text doesn't go under the X
          placeholder="Search in library..."
          placeholderTextColor={styles.placeholderText.color}
          value={searchQuery}
          onChangeText={onSearchChange}
          autoCorrect={false}
          clearButtonMode="never"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity // Clear search button (X)
            onPress={() => onSearchChange('')}
            style={{
              position: 'absolute',
              right: 24,
              top: 4,
              bottom: 0,
              justifyContent: 'center',
              paddingHorizontal: 4,
              paddingVertical: 4,
            }}
            accessibilityLabel="Clear search"
          >
            <Text style={{ fontSize: 18, color: theme.colors.text.secondary }}>✕</Text>
          </TouchableOpacity>
        )}
      </View>
      
      {/* SORTING AND FILTERING CONTROLS */}
      <View style={styles.sortContainer}>
        <View style={styles.sortHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>

            <TouchableOpacity // Sort button
              onPress={() => setShowSortOptions((v) => !v)}
              style={[
                styles.sortLabelButton,
                showSortOptions && { backgroundColor: theme.colors.button.primary }
              ]}
            >
              <Text style={styles.sortLabel}>
                Sort by {SORT_OPTIONS[sortMode].label}{getSortIndicator(sortMode)}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity // Rating filter button
              onPress={handleRatingButton}
              style={[
                styles.sortLabelButton,
                showRatingSlider && { backgroundColor: theme.colors.button.primary }
              ]}
            >
              <Text style={styles.sortLabel}>
                {sliderValues[0] === sliderValues[1]
                  ? `Rating: ${sliderValues[0] === 10 ? '10' 
                    : sliderValues[0] === 0 ? 'N/A' 
                    : sliderValues[0].toFixed(1)}`
                  : `Rating: ${sliderValues[0] === 10 ? '10' : sliderValues[0].toFixed(1)} - ${sliderValues[1] === 10 ? '10' : sliderValues[1].toFixed(1)}`}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity // Tags filter button
              onPress={() => setShowTagsModal(true)}
              style={[
                styles.sortLabelButton,
                isTagFilterActive && { backgroundColor: theme.colors.button.primary }
              ]}
            >
              <Text style={styles.sortLabel}>
                Tags{isTagFilterActive ? ` (${selectedTagIds.length})` : ''}
              </Text>
            </TouchableOpacity>

          </View>

          {/* Shows total count of music in library
          <Text style={styles.resultCount}>
            {resultCount} songs
          </Text>*/}

        </View>
        {showSortOptions && (
          <View style={styles.sortButtons}>
            {(Object.keys(SORT_OPTIONS) as SortMode[]).map((mode) => (
              <TouchableOpacity // Sort options
                key={mode}
                style={[styles.sortButton, sortMode === mode && styles.sortButtonActive]}
                onPress={() => handleSortPress(mode)}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons
                    name={SORT_OPTIONS[mode].icon}
                    size={20}
                    color={sortMode === mode ? theme.colors.text.primary : theme.colors.text.muted}
                  />
                  {sortMode === mode && (
                    <Ionicons
                      name={isReversed ? 'arrow-down' : 'arrow-up'}
                      size={16}
                      color={theme.colors.text.primary}
                    />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
        {showRatingSlider && (
          <View style={{ marginTop: 8 }}>
            <MultiSlider
              values={sliderValues}
              sliderLength={300}
              onValuesChange={vals => setSliderValues([Number(vals[0]), Number(vals[1])])}
              onValuesChangeFinish={vals => {
                setSliderValues([Number(vals[0]), Number(vals[1])]);
                if (onRatingFilterChange) {
                  onRatingFilterChange([Number(vals[0]), Number(vals[1])]);
                }
              }}
              min={0}
              max={10}
              step={0.5}
              allowOverlap={true}
              minMarkerOverlapDistance={0}
              snapped={true}
              markerStyle={{
                backgroundColor: theme.colors.text.primary,
                height: 24,
                width: 24,
                borderWidth: 1.5,
                borderColor: theme.colors.blue,
              }}
              selectedStyle={{
                backgroundColor: theme.colors.blue,
              }}
              containerStyle={{ alignSelf: 'center' }}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            </View>
          </View>
        )}
      </View>

      {/* TAGS FILTER MODAL */}
      <Modal
        visible={showTagsModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTagsModal(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <View style={{
            backgroundColor: theme.colors.background.surface,
            borderRadius: 16,
            padding: 20,
            minWidth: 300,
            maxWidth: '90%',
            maxHeight: '80%',
          }}>
            <Text style={[styles.sortLabel, { marginBottom: 12, fontWeight: 'bold', fontSize: 18 }]}>
              Filter by Tags
            </Text>
            <ScrollView style={{ maxHeight: 300 }}>
              {tags.map(tag => {
                const isSelected = selectedTagIds.includes(tag.id);
                const isExcluded = excludedTagIds.includes(tag.id);
                return (
                  <TouchableOpacity
                    key={tag.id}
                    onPress={() => handleTagPress(tag.id)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      marginBottom: 8,
                      padding: 8,
                      borderRadius: 12,
                      backgroundColor: isSelected
                        ? tag.color
                        : isExcluded
                          ? theme.colors.button.cancel // Use a "cancel" color for excluded
                          : theme.colors.background.surface,
                      borderWidth: 1,
                      borderColor: tag.color,
                      opacity: isExcluded ? 0.7 : 1, // Slightly faded for excluded
                    }}
                  >
                    <Text style={{
                      color: isExcluded ? theme.colors.text.error : theme.colors.text.primary,
                      fontWeight: isSelected ? 'bold' : 'normal',
                      flex: 1,
                    }}>
                      {tag.name}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark" size={18} color={theme.colors.text.primary} />
                    )}
                    {isExcluded && (
                      <Ionicons name="remove-circle-outline" size={18} color={theme.colors.text.error} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity
              onPress={() => setShowTagsModal(false)}
              style={{
                marginTop: 16,
                backgroundColor: theme.colors.button.cancel,
                padding: 10,
                borderRadius: 8,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: theme.colors.text.primary, fontWeight: 'bold' }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

export { SORT_OPTIONS };
export type { SortMode };