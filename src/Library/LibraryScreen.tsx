// src/screens/LibraryScreen.tsx
// Screen for displaying music library
import React, { useCallback, useState } from 'react';
import { RatingHistoryModal } from '../components/RatingHistoryModal';
import { RefreshControl } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SavedMusic } from '../types';
import { MusicItem } from '../components/MusicItem';
import { LibraryEmptyState } from '../Library/LibraryEmptyState';
import { LibraryHeader } from '../Library/LibraryHeader';
import { StarRatingModal } from '../components/StarRatingModal';
import { OptionsModal } from '../components/OptionsModal';
import { useLibrary } from './useLibrary';
import { useModal } from '../hooks/useModal';
import { libraryStyles as styles } from './styles/LibraryScreen.styles';
import { getTags } from '../services/tagService';
import { Tag } from '../types';
import { Ionicons } from '@expo/vector-icons';
import { useMusicStore } from '../store/musicStore';

export default function LibraryScreen() {
  // Add ratingFilter state
  const [ratingFilter, setRatingFilter] = useState<[number, number]>([0, 10]);

  const [tags, setTags] = useState<Tag[]>([]);
  const [tagsLoading, setTagsLoading] = useState(true);

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
    ratingModalVisible,
    selectedMusic,
    handleRatingSave,
    handleRatingCancel,
    modalProps: libraryModalProps,
  } = useLibrary(ratingFilter); // Pass ratingFilter to useLibrary

  // Options modal for long press actions
  const { showModal: showOptionsModal, modalProps: optionsModalProps } = useModal();
  
  // Info modal for MusicItem fallback
  const { showModal: showInfoModal, modalProps: infoModalProps } = useModal();

  // Rating history modal state
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [historyMusic, setHistoryMusic] = useState<SavedMusic | null>(null);

  const handleShowHistory = useCallback((music: SavedMusic) => {
    setHistoryMusic(music);
    setHistoryModalVisible(true);
  }, []);

  const handleLongPress = useCallback((music: SavedMusic) => {
    showOptionsModal({
      title: music.title,
      message: `Options for "${music.title}"`,
      actions: [
        {
          text: 'Rating History',
          icon: { name: 'time-outline', color: '#006effff' },
          style: 'default',
          onPress: () => handleShowHistory(music),
        },
        {
          text: 'Delete',
          icon: { name: 'trash-outline', color: '#FF3B30' },
          style: 'destructive',
          onPress: () => handleMusicAction(music, 'delete'),
        },
        {
          text: 'Cancel',
          icon: { name: 'close-outline', color: '#8E8E93' },
          style: 'cancel',
          onPress: () => {}, // Modal will auto-close
        },
      ],
    });
  }, [showOptionsModal, handleMusicAction, handleShowHistory]);

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
      tags={tags}
    />
  ), [handleMusicAction, handleLongPress, handleShowInfoModal, tags]);

  const hasMusic = savedMusic.length > 0;
  const shouldShowList = hasMusic && !loading && !error && !(searchQuery.trim() && processedMusic.length === 0);

  // Fetch tags on mount and whenever the rating modal is opened
  React.useEffect(() => {
    let mounted = true;
    setTagsLoading(true);
    getTags().then(tagList => {
      if (mounted) setTags(tagList);
    }).finally(() => {
      if (mounted) setTagsLoading(false);
    });
    return () => { mounted = false; };
  }, []);

  // Optionally, keep the ratingModalVisible effect if you want to refresh tags when rating modal opens
  React.useEffect(() => {
    if (ratingModalVisible) {
      setTagsLoading(true);
      getTags().then(tagList => {
        setTags(tagList);
      }).finally(() => {
        setTagsLoading(false);
      });
    }
  }, [ratingModalVisible]);

  // Handler to delete a rating history entry
  const handleDeleteHistoryEntry = useCallback(async (music: SavedMusic, entryIdx: number) => {
    if (!music.firebaseId) return;
    await useMusicStore.getState().updateRatingHistory(music.firebaseId, entryIdx);
    // Optionally update local modal state
    setHistoryMusic(prev =>
      prev && prev.firebaseId === music.firebaseId
        ? { ...prev, ratingHistory: prev.ratingHistory?.filter((_, i) => i !== entryIdx) }
        : prev
    );
  }, []);

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
          ratingFilter={ratingFilter}
          onRatingFilterChange={setRatingFilter}
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
          extraData={tags}
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
        itemName={selectedMusic ? `${selectedMusic.artist}` : ''}
        initialRating={selectedMusic?.rating ?? 0}
        tags={tags}
        initialSelectedTagIds={selectedMusic?.tags ?? []}
        onSave={handleRatingSave}
        onCancel={handleRatingCancel}
      />

      {/* RATING HISTORY MODAL */}
      {historyModalVisible && historyMusic && (
        <RatingHistoryModal
          visible={historyModalVisible}
          music={historyMusic}
          onClose={() => setHistoryModalVisible(false)}
          onDeleteEntry={handleDeleteHistoryEntry}
        />
      )}
    </SafeAreaView>
  );
}
