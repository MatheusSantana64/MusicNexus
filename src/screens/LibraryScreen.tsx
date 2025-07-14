// src/screens/LibraryScreen.tsx
// Simplified screen for managing saved music
import React, { useCallback } from 'react';
import { Alert, RefreshControl } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SavedMusic } from '../types/music';
import { MusicItem } from '../components/MusicItem';
import { LibraryEmptyState } from '../components/LibraryEmptyState';
import { LibraryHeader } from '../components/LibraryHeader';
import { useLibrary } from '../hooks/useLibrary';
import { libraryStyles as styles } from '../styles/screens/LibraryScreen.styles';

export default function LibraryScreen() {
  const {
    sortMode,
    isReversed,
    searchQuery,
    savedMusic,
    processedMusic,
    loading,
    error,
    refreshing,
    setSortMode,
    setSearchQuery,
    handleMusicAction,
    refresh,
    clearSearch,
  } = useLibrary();

  const renderItem = useCallback(({ item }: { item: SavedMusic }) => (
    <MusicItem
      music={item}
      onPress={(music) => handleMusicAction(music as SavedMusic, 'rate')}
      onLongPress={(music) => {
        Alert.alert(
          music.title,
          `Options for "${music.title}"`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Rate', onPress: () => handleMusicAction(music as SavedMusic, 'rate') },
            { text: 'Delete', style: 'destructive', onPress: () => handleMusicAction(music as SavedMusic, 'delete') },
          ]
        );
      }}
    />
  ), [handleMusicAction]);

  const hasMusic = savedMusic.length > 0;
  const shouldShowList = hasMusic && !loading && !error && !(searchQuery.trim() && processedMusic.length === 0);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {hasMusic && (
        <LibraryHeader
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          sortMode={sortMode}
          isReversed={isReversed}
          onSortModeChange={setSortMode}
          resultCount={processedMusic.length}
          totalCount={savedMusic.length}
        />
      )}
      
      {shouldShowList ? (
        <FlashList
          data={processedMusic}
          keyExtractor={(item) => item.firebaseId!}
          renderItem={renderItem}
          estimatedItemSize={80}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              tintColor="#007AFF"
            />
          }
          removeClippedSubviews
        />
      ) : (
        <LibraryEmptyState
          loading={loading}
          error={error}
          searchQuery={searchQuery}
          savedMusicLength={savedMusic.length}
          processedMusicLength={processedMusic.length}
          onRetry={refresh}
          onClearSearch={clearSearch}
        />
      )}
    </SafeAreaView>
  );
}
