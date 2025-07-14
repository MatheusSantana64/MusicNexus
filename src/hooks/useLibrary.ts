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
      Alert.prompt(
        'Update Rating',
        `Enter a new rating from 1 to 10 for "${music.title}"`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Save', 
            onPress: async (rating) => {
              const numRating = parseInt(rating || '0');
              
              if (numRating < 0 || numRating > 10) {
                Alert.alert('Error', 'Enter a rating between 0 and 10');
                return;
              }

              const success = await updateRating(music.firebaseId!, numRating);
              if (!success) {
                Alert.alert('Error', 'Could not update the rating');
              }
            }
          },
        ],
        'plain-text',
        music.rating.toString(),
        'numeric'
      );
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
    
    // Actions
    setSortMode: handleSortModeChange,
    setSearchQuery,
    handleMusicAction,
    refresh,
    clearSearch,
  };
}