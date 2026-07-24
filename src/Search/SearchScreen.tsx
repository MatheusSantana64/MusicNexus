// src/Search/SearchScreen.tsx
// SearchScreen for searching music online (Spotify/Deezer) and displaying results
import React, { useState, useCallback, useMemo, useRef } from 'react';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TextInput } from 'react-native';
import { MusicTrack, SearchMode } from '../types';
import { useSearch } from './useSearch';
import { useMusicOperations } from '../hooks/useMusicOperations';
import { useAlbumGrouping } from '../hooks/useAlbumGrouping';
import { useModal } from '../hooks/useModal';
import { MusicItem } from '../components/MusicItem';
import { SearchBar } from './SearchBar';
import { AlbumHeader, AlbumGroup } from './AlbumHeader';
import { SearchEmptyState } from './SearchEmptyState';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { StarRatingModal } from '../components/StarRatingModal';
import { OptionsModal } from '../components/OptionsModal';
import { searchStyles as styles } from './styles/SearchScreen.styles';
import { getTags } from '../services/tagService';
import { Tag } from '../types';
import { ImportPlaylistModal } from './ImportPlaylistModal';

export default function SearchScreen({ navigation }: { navigation?: any }) {
  const [searchQuery, setSearchQuery] = useState('');
  const { tracks, loading, error, searchMode, searchTracks, loadMore, setSearchMode, clearResults, hasSearched } = useSearch();
  const { 
    handleTrackPress, 
    handleAlbumSave, 
    isTrackSaving, 
    isAlbumSaving, 
    isMusicSaved,
    // MODAL STATE
    ratingModalVisible,
    selectedTrack,
    selectedAlbum,
    ratingType,
    handleRatingSave,
    handleRatingCancel,
  } = useMusicOperations();
  
  // Info modal for MusicItem fallback
  const { showModal: showInfoModal, modalProps: infoModalProps } = useModal();
  
  const albumGroups = useAlbumGrouping(tracks, searchMode);
  const [tags, setTags] = useState<Tag[]>([]);
  const [tagsLoading, setTagsLoading] = useState(true);
  const searchInputRef = useRef<TextInput>(null);

  // Import playlist modal state
  const [importModalVisible, setImportModalVisible] = useState(false);

  // Fetch tags on mount
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      setTagsLoading(true);
      try {
        const tagList = await getTags();
        if (mounted) setTags(tagList);
      } finally {
        setTagsLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  React.useEffect(() => {
    if (!navigation) return;
    const unsubscribe = navigation.addListener('tabPress', (e: any) => {
      if (navigation.isFocused()) {
        searchInputRef.current?.focus();
      }
    });
    return unsubscribe;
  }, [navigation]);

  const handleSearch = useCallback(async (text: string) => {
    setSearchQuery(text);
    clearResults();
    await searchTracks(text);
  }, [searchTracks, clearResults]);

  const handleModeChange = useCallback(async (mode: SearchMode) => {
    setSearchMode(mode);
    await searchTracks(searchQuery, mode);
  }, [setSearchMode, searchTracks, searchQuery]);

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

  const renderTrackItem = useCallback(({ item }: { item: MusicTrack }) => (
    <MusicItem 
      music={item} 
      onPress={handleTrackPress}
      isLoading={isTrackSaving(item.id)}
      showInfoModal={handleShowInfoModal}
    />
  ), [handleTrackPress, isTrackSaving, handleShowInfoModal]);

  const renderAlbumHeader = useCallback((albumGroup: AlbumGroup) => {
    const { albumId, tracks: albumTracks } = albumGroup;
    const savedCount = albumTracks.filter(track => isMusicSaved(track.id)).length;
    
    return (
      <AlbumHeader
        albumGroup={albumGroup}
        savedCount={savedCount}
        totalCount={albumTracks.length}
        isLoading={isAlbumSaving(albumId)}
        onSaveAlbum={handleAlbumSave}
      />
    );
  }, [handleAlbumSave, isAlbumSaving, isMusicSaved]);

  // Memoize the flat data for performance
  const memoizedFlatData = useMemo(() => {
    const flatData: Array<{ type: 'album' | 'track'; data: any }> = [];
    
    // FIX: Use valid SearchMode values
    if (
      searchMode === 'tidal_album' ||
      searchMode === 'spotify_album' ||
      searchMode === 'deezer_album'
    ) {
      albumGroups.forEach(albumGroup => {
        flatData.push({ type: 'album', data: albumGroup });
        albumGroup.tracks.forEach(track => {
          flatData.push({ type: 'track', data: track });
        });
      });
    } else {
      tracks.forEach(track => {
        flatData.push({ type: 'track', data: track });
      });
    }
    
    return flatData;
  }, [searchMode, albumGroups, tracks]);

  const renderItem = useCallback(({ item }: { item: { type: 'album' | 'track'; data: any } }) => {
    if (item.type === 'album') {
      return renderAlbumHeader(item.data);
    } else {
      return renderTrackItem({ item: item.data });
    }
  }, [renderAlbumHeader, renderTrackItem]);

  const getItemType = useCallback((item: { type: 'album' | 'track'; data: any }) => {
    return item.type;
  }, []);

  const keyExtractor = useCallback((item: { type: 'album' | 'track'; data: any }, index: number) => {
    return item.type === 'album' 
      ? `album-${item.data.albumId}` 
      : `track-${item.data.id}`;
  }, []);

  // Handler to open modal
  const handleOpenImportModal = () => {
    setImportModalVisible(true);
  };

  return (
    <ErrorBoundary>
      <SafeAreaView style={styles.container} edges={['top']}>
        <SearchBar
          searchQuery={searchQuery}
          onSearchChange={handleSearch}
          loading={loading}
          searchMode={searchMode}
          onModeChange={handleModeChange}
          searchInputRef={searchInputRef} // Pass ref
        />
        <FlashList
          data={memoizedFlatData}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          getItemType={getItemType}
          estimatedItemSize={80}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={() => (
            <SearchEmptyState
              loading={loading}
              error={error}
              searchQuery={searchQuery}
              tracksLength={tracks.length}
              searchMode={searchMode}
              onImportPlaylist={handleOpenImportModal}
              hasSearched={hasSearched}
            />
          )}
          showsVerticalScrollIndicator={false}
        />

        {/* INFO MODAL - for MusicItem info display */}
        <OptionsModal {...infoModalProps} />

        {/* STAR RATING MODAL FOR SEARCH SCREEN */}
        <StarRatingModal
          visible={ratingModalVisible}
          title={ratingType === 'track' ? 'Rate Song' : 'Rate Album'}
          itemName={
            ratingType === 'track' && selectedTrack
              ? `${selectedTrack.title} - ${selectedTrack.artist.name}`
              : selectedAlbum
              ? `${selectedAlbum.album.title} - ${selectedAlbum.artist.name}`
              : ''
          }
          initialRating={0}
          tags={tags}
          initialSelectedTagIds={[]} // No tags for new tracks
          onSave={handleRatingSave}
          onCancel={handleRatingCancel}
        />

        {/* Import Playlist Modal */}
        <ImportPlaylistModal
          visible={importModalVisible}
          onCancel={() => setImportModalVisible(false)}
          onImport={() => setImportModalVisible(false)}
        />
      </SafeAreaView>
    </ErrorBoundary>
  );
}
