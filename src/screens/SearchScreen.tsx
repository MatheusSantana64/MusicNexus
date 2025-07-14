// src/screens/SearchScreen.tsx
// Screen for searching music online (Deezer API)
import React, { useState, useCallback, useMemo } from 'react';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DeezerTrack, SearchMode } from '../types/music';
import { useSearch } from '../hooks/useSearch';
import { useMusicOperations } from '../hooks/useMusicOperations';
import { useAlbumGrouping } from '../hooks/useAlbumGrouping';
import { MusicItem } from '../components/MusicItem';
import { SearchBar } from '../components/SearchBar';
import { AlbumHeader, AlbumGroup } from '../components/AlbumHeader';
import { SearchEmptyState } from '../components/SearchEmptyState';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { StarRatingModal } from '../components/StarRatingModal';
import { searchStyles as styles } from '../styles/screens/SearchScreen.styles';

const MIN_SEARCH_LENGTH = 3;

export default function SearchScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const { tracks, loading, error, searchMode, searchTracks, setSearchMode } = useSearch();
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
  
  const albumGroups = useAlbumGrouping(tracks, searchMode);

  const handleSearch = useCallback(async (text: string) => {
    setSearchQuery(text);
    await searchTracks(text);
  }, [searchTracks]);

  const handleModeChange = useCallback(async (mode: SearchMode) => {
    setSearchMode(mode);
    if (searchQuery.length >= MIN_SEARCH_LENGTH) {
      await searchTracks(searchQuery, mode);
    }
  }, [setSearchMode, searchTracks, searchQuery]);

  const renderTrackItem = useCallback(({ item }: { item: DeezerTrack }) => (
    <MusicItem 
      music={item} 
      onPress={handleTrackPress}
      isLoading={isTrackSaving(item.id)}
    />
  ), [handleTrackPress, isTrackSaving]);

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
    
    if (searchMode === 'album' && albumGroups.length > 0) {
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

  return (
    <ErrorBoundary>
      <SafeAreaView style={styles.container} edges={['top']}>
        <SearchBar
          searchQuery={searchQuery}
          onSearchChange={handleSearch}
          loading={loading}
          searchMode={searchMode}
          onModeChange={handleModeChange}
        />
        <FlashList
          data={memoizedFlatData}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          getItemType={getItemType}
          estimatedItemSize={80}
          ListEmptyComponent={() => (
            <SearchEmptyState
              loading={loading}
              error={error}
              searchQuery={searchQuery}
              tracksLength={tracks.length}
              searchMode={searchMode}
            />
          )}
          showsVerticalScrollIndicator={false}
        />

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
          onSave={handleRatingSave}
          onCancel={handleRatingCancel}
        />
      </SafeAreaView>
    </ErrorBoundary>
  );
}