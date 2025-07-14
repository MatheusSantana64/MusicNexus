// src/screens/SearchScreen.tsx
// Screen for searching music online (Deezer API)
import React, { useState, useCallback } from 'react';
import { View, FlatList } from 'react-native';
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
    isMusicSaved 
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

  const renderTrackList = useCallback(() => {
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

    return (
      <FlatList
        data={flatData}
        keyExtractor={(item, index) => 
          item.type === 'album' 
            ? `album-${item.data.albumId}` 
            : `track-${item.data.id}`
        }
        renderItem={({ item }) => 
          item.type === 'album' 
            ? renderAlbumHeader(item.data)
            : renderTrackItem({ item: item.data })
        }
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
        removeClippedSubviews
        maxToRenderPerBatch={10}
        windowSize={10}
      />
    );
  }, [searchMode, albumGroups, tracks, renderAlbumHeader, renderTrackItem, loading, error, searchQuery]);

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
        {renderTrackList()}
      </SafeAreaView>
    </ErrorBoundary>
  );
}