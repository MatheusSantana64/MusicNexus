// src/Library/useLibrary.ts
// Hook for managing library operations and logic
import React, { useState, useCallback, useMemo } from 'react';
import { SavedMusic } from '../types';
import { useMusicStore } from '../store/musicStore';
import { SORT_OPTIONS, SortMode } from '../Library/LibraryHeader';
import { useModal } from '../hooks/useModal';

export function useLibrary(ratingFilter?: [number, number]) {
  const [sortMode, setSortMode] = useState<SortMode>('release');
  const [isReversed, setIsReversed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // State for rating modal
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [selectedMusic, setSelectedMusic] = useState<SavedMusic | null>(null);
  const [selectedTagIds, setSelectedTagIds] = React.useState<string[]>([]);
  const [excludedTagIds, setExcludedTagIds] = React.useState<string[]>([]);

  // Modal hook for confirmations
  const { showModal, modalProps } = useModal();

  const {
    savedMusic,
    loading,
    error,
    refreshing,
    currentSortMode,
    updateRating,
    deleteMusic,
    refresh,
    loadMusic,
  } = useMusicStore();

  // Load music with new sort when sort mode changes
  React.useEffect(() => {
    if (sortMode !== currentSortMode) {
      loadMusic(sortMode);
    }
  }, [sortMode, currentSortMode, loadMusic]);

  // Process music: filter + hierarchical sort in memory
  const processedMusic = useMemo(() => {
    let filtered = savedMusic;

    // Filter by rating range if provided
    if (ratingFilter) {
      filtered = filtered.filter(
        item => item.rating >= ratingFilter[0] && item.rating <= ratingFilter[1]
      );
    }

    // Filter by selected tags (must have all selected tags)
    if (selectedTagIds.length > 0) {
      filtered = filtered.filter(item =>
        Array.isArray(item.tags) &&
        selectedTagIds.every(tagId => item.tags.includes(tagId))
      );
    }

    // Exclude songs with any excluded tag
    if (excludedTagIds.length > 0) {
      filtered = filtered.filter(item =>
        Array.isArray(item.tags) &&
        excludedTagIds.every(tagId => !item.tags.includes(tagId))
      );
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const searchTerm = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(searchTerm) ||
        item.artist.toLowerCase().includes(searchTerm) ||
        item.album.toLowerCase().includes(searchTerm)
      );
    }

    // Apply hierarchical sorting with the user's sort preference
    const sortFunction = isReversed
      ? SORT_OPTIONS[sortMode].reverseFn
      : SORT_OPTIONS[sortMode].sortFn;

    return [...filtered].sort(sortFunction);
  }, [savedMusic, searchQuery, sortMode, isReversed, ratingFilter, selectedTagIds, excludedTagIds]);

  // Unified handler for music actions
  const handleMusicAction = useCallback((music: SavedMusic, action: 'rate' | 'delete') => {
    if (action === 'rate') {
      setSelectedMusic(music);
      setRatingModalVisible(true);
    } else if (action === 'delete') {
      showModal({
        title: 'Remove Music',
        message: `Are you sure you want to remove "${music.title}" from your library?`,
        actions: [
          {
            text: 'Remove',
            style: 'destructive',
            onPress: async () => {
              const success = await deleteMusic(music.firebaseId!);
              if (!success) {
                showModal({
                  title: 'Error',
                  message: 'Could not remove the music',
                  actions: [
                    { text: 'OK', style: 'default', onPress: () => {} }
                  ],
                });
              }
            },
          },
          { text: 'Cancel', style: 'cancel', onPress: () => {} },
        ],
      });
    }
  }, [updateRating, deleteMusic, showModal]);

  // HANDLE RATING SAVE
  const handleRatingSave = useCallback(async (rating: number, tags: string[]) => {
    if (!selectedMusic) return;

    // Prevent update if rating and tags are unchanged
    const isSameRating = selectedMusic.rating === rating;
    const areTagsSame =
      Array.isArray(selectedMusic.tags) &&
      Array.isArray(tags) &&
      selectedMusic.tags.length === tags.length &&
      selectedMusic.tags.every((tag) => tags.includes(tag));

    if (isSameRating && areTagsSame) {
      setRatingModalVisible(false);
      setSelectedMusic(null);
      return; // No update needed
    }

    setRatingModalVisible(false);
    setSelectedMusic(null);

    // Update rating and tags in background
    const success = await updateRating(selectedMusic.firebaseId!, rating, tags);
    if (!success) {
      showModal({
        title: 'Error',
        message: 'Could not update the rating/tags',
        actions: [
          { text: 'OK', style: 'default', onPress: () => {} }
        ],
      });
    }
  }, [selectedMusic, updateRating, showModal]);

  // HANDLE RATING CANCEL
  const handleRatingCancel = useCallback(() => {
    setRatingModalVisible(false);
    setSelectedMusic(null);
  }, []);

  const handleSortModeChange = useCallback((mode: SortMode, reversed: boolean = false) => {
    setSortMode(mode);
    setIsReversed(reversed);
  }, []);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  return {
    // State
    sortMode,
    isReversed,
    searchQuery,
    savedMusic,
    processedMusic,
    loading,
    error,
    refreshing,
    
    // MODAL STATE TO RETURN
    ratingModalVisible,
    selectedMusic,
    selectedTagIds,
    excludedTagIds,
    
    // MODAL PROPS FOR OPTIONS/CONFIRMATIONS
    modalProps,
    
    // Actions
    setSortMode: handleSortModeChange,
    setSearchQuery,
    handleMusicAction,
    refresh,
    clearSearch,
    setSelectedTagIds,
    setExcludedTagIds,
    // RATING HANDLERS TO RETURN
    handleRatingSave,
    handleRatingCancel,
  };
}