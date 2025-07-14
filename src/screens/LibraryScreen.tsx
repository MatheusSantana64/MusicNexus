// src/screens/LibraryScreen.tsx
// Screen for displaying music library
import React, { useCallback } from 'react';
import { RefreshControl } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SavedMusic } from '../types/music';
import { MusicItem } from '../components/MusicItem';
import { LibraryEmptyState } from '../components/LibraryEmptyState';
import { LibraryHeader } from '../components/LibraryHeader';
import { StarRatingModal } from '../components/StarRatingModal';
import { OptionsModal } from '../components/OptionsModal';
import { useLibrary } from '../hooks/useLibrary';
import { useModal } from '../hooks/useModal';
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
    // MODAL STATE
    ratingModalVisible,
    selectedMusic,
    handleRatingSave,
    handleRatingCancel,
    // CONFIRMATION MODAL PROPS FROM useLibrary
    modalProps: libraryModalProps,
  } = useLibrary();

  // Options modal for long press actions
  const { showModal: showOptionsModal, modalProps: optionsModalProps } = useModal();
  
  // Info modal for MusicItem fallback
  const { showModal: showInfoModal, modalProps: infoModalProps } = useModal();

  const handleLongPress = useCallback((music: SavedMusic) => {
    showOptionsModal({
      title: music.title,
      message: `Options for "${music.title}"`,
      actions: [
        {
          text: '⭐ Rate',
          style: 'default',
          onPress: () => handleMusicAction(music, 'rate'),
        },
        {
          text: '🗑️ Delete',
          style: 'destructive',
          onPress: () => handleMusicAction(music, 'delete'),
        },
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => {}, // Modal will auto-close
        },
      ],
    });
  }, [showOptionsModal, handleMusicAction]);

  const handleShowInfoModal = useCallback((title: string, message: string) => {
    showInfoModal({
      title,
      message,
      actions: [
        {
          text: 'Close',
          style: 'cancel',
          onPress: () => {},
        },
      ],
    });
  }, [showInfoModal]);

  const renderItem = useCallback(({ item }: { item: SavedMusic }) => (
    <MusicItem
      music={item}
      onPress={(music) => handleMusicAction(music as SavedMusic, 'rate')}
      onLongPress={handleLongPress}
      showInfoModal={handleShowInfoModal}
    />
  ), [handleMusicAction, handleLongPress, handleShowInfoModal]);

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

      {/* OPTIONS MODAL - for long press actions */}
      <OptionsModal {...optionsModalProps} />

      {/* CONFIRMATION MODALS - for delete confirmations and error messages */}
      <OptionsModal {...libraryModalProps} />

      {/* INFO MODAL - for MusicItem info display */}
      <OptionsModal {...infoModalProps} />

      {/* STAR RATING MODAL */}
      <StarRatingModal
        visible={ratingModalVisible}
        title={selectedMusic ? `${selectedMusic.title}` : ''}
        itemName={selectedMusic ? `${selectedMusic.artist}\n${selectedMusic.album}` : ''}
        initialRating={selectedMusic?.rating ?? 0}
        onSave={handleRatingSave}
        onCancel={handleRatingCancel}
      />
    </SafeAreaView>
  );
}
