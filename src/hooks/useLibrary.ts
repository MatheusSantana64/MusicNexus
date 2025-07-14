// src/hooks/useLibrary.ts
// Hook for managing library operations and logic
import { useState, useCallback, useMemo } from 'react';
import { Alert } from 'react-native';
import { SavedMusic } from '../types/music';
import { useMusicStore } from '../store/musicStore';
import { SORT_OPTIONS, SortMode } from '../components/LibraryHeader';

export function useLibrary() {
  const [sortMode, setSortMode] = useState<SortMode>('recent');
  const [isReversed, setIsReversed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // State for rating modal
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [selectedMusic, setSelectedMusic] = useState<SavedMusic | null>(null);

  const {
    savedMusic,
    loading,
    error,
    refreshing,
    updateRating,
    deleteMusic,
    refresh,
  } = useMusicStore();

  // Process music: filter + sort in one step
  const processedMusic = useMemo(() => {
    let filtered = savedMusic;
    
    // Filter by search query
    if (searchQuery.trim()) {
      const searchTerm = searchQuery.toLowerCase().trim();
      filtered = savedMusic.filter(item => 
        item.title.toLowerCase().includes(searchTerm) ||
        item.artist.toLowerCase().includes(searchTerm) ||
        item.album.toLowerCase().includes(searchTerm)
      );
    }
    
    // Sort with reverse capability
    const sortFunction = isReversed 
      ? SORT_OPTIONS[sortMode].reverseFn 
      : SORT_OPTIONS[sortMode].sortFn;
    
    return [...filtered].sort(sortFunction);
  }, [savedMusic, searchQuery, sortMode, isReversed]);

  // Unified handler for music actions
  const handleMusicAction = useCallback((music: SavedMusic, action: 'rate' | 'delete') => {
    if (action === 'rate') {
      setSelectedMusic(music);
      setRatingModalVisible(true);
    } else if (action === 'delete') {
      Alert.alert(
        'Remove Music',
        `Are you sure you want to remove "${music.title}" from your library?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: async () => {
              const success = await deleteMusic(music.firebaseId!);
              if (!success) {
                Alert.alert('Error', 'Could not remove the music');
              }
            },
          },
        ]
      );
    }
  }, [updateRating, deleteMusic]);

  // HANDLE RATING SAVE
  const handleRatingSave = useCallback(async (rating: number) => {
    if (!selectedMusic) return;
    
    const success = await updateRating(selectedMusic.firebaseId!, rating);
    if (!success) {
      Alert.alert('Error', 'Could not update the rating');
    }
    
    setRatingModalVisible(false);
    setSelectedMusic(null);
  }, [selectedMusic, updateRating]);

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
    
    // Actions
    setSortMode: handleSortModeChange,
    setSearchQuery,
    handleMusicAction,
    refresh,
    clearSearch,
    // RATING HANDLERS TO RETURN
    handleRatingSave,
    handleRatingCancel,
  };
}