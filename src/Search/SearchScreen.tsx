// src/screens/SearchScreen.tsx
// Screen for searching music online (Deezer API)
import React, { useState, useCallback, useMemo, useRef } from 'react';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TextInput, Modal, View, Text, Button } from 'react-native';
import { DeezerTrack, SearchMode } from '../types';
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
import { saveMusicBatch } from '../services/musicService'; // Import batch save
import { DeezerApiClient } from '../services/deezer/deezerApiClient'; // Import Deezer API client
import { useMusicStore } from '../store/musicStore';
import { ImportPlaylistModal } from './ImportPlaylistModal';

const BATCH_SIZE = 50;
const BATCH_DELAY_MS = 1500;

export default function SearchScreen({ navigation }: { navigation?: any }) {
  const [searchQuery, setSearchQuery] = useState('');
  const { tracks, loading, error, searchMode, searchTracks, setSearchMode, clearResults, hasSearched } = useSearch();
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
  const [playlistLink, setPlaylistLink] = useState('');
  const [importRating, setImportRating] = useState(0);
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

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
    clearResults(); // <-- Clear results immediately
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

  const renderTrackItem = useCallback(({ item }: { item: DeezerTrack }) => (
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
    setPlaylistLink('');
    setImportRating(0);
    setImportError(null);
  };

  async function fetchTracksInBatches(trackIds: string[]): Promise<DeezerTrack[]> {
    const allTracks: DeezerTrack[] = [];
    for (let i = 0; i < trackIds.length; i += BATCH_SIZE) {
      const batchIds = trackIds.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batchIds.map(id => DeezerApiClient.getTrackById(id))
      );
      // Filter out nulls
      allTracks.push(...batchResults.filter((track): track is DeezerTrack => track !== null));
      if (i + BATCH_SIZE < trackIds.length) {
        await new Promise(res => setTimeout(res, BATCH_DELAY_MS));
      }
    }
    return allTracks;
  }

  // Handler to import playlist
  const handleImportPlaylist = async () => {
    setImportLoading(true);
    setImportError(null);
    try {
      // Accept either a full link or just the ID
      let playlistId = '';
      const match = playlistLink.match(/playlist\/(\d+)/);
      if (match) {
        playlistId = match[1];
      } else if (/^\d+$/.test(playlistLink.trim())) {
        playlistId = playlistLink.trim();
      } else {
        throw new Error('Please enter a valid Deezer playlist link or ID');
      }

      // Fetch playlist tracks from Deezer API
      const response = await fetch(`https://api.deezer.com/playlist/${playlistId}`);
      const playlistData = await response.json();
      if (!playlistData.tracks || !playlistData.tracks.data) throw new Error('No tracks found in playlist');
      const tracks = playlistData.tracks.data;
      const trackIds = tracks.map((track: DeezerTrack) => track.id);

      // Fetch all tracks in batches to avoid quota errors
      const resolvedTracks = await fetchTracksInBatches(trackIds);

      // Filter out tracks already in the library
      const existingIds = new Set(useMusicStore.getState().savedMusic.map(m => m.id));
      const newTracks = resolvedTracks.filter(track => !existingIds.has(track.id));

      // Save only new tracks in batch
      const firebaseIds = await saveMusicBatch(newTracks, importRating);

      // Build SavedMusic objects for local store
      const now = new Date();
      const savedMusics = newTracks.map((track, idx) => ({
        id: track.id,
        title: track.title,
        artist: track.artist.name,
        artistId: track.artist.id,
        album: track.album.title,
        albumId: track.album.id,
        coverUrl: track.album.cover_medium,
        preview: track.preview,
        duration: track.duration,
        rating: importRating,
        releaseDate: track.album.release_date,
        trackPosition: track.track_position || 1,
        diskNumber: track.disk_number || 1,
        savedAt: now,
        firebaseId: firebaseIds[idx],
        tags: [],
        ratingHistory: importRating > 0 ? [{ rating: importRating, timestamp: now.toISOString() }] : [],
      }));

      // Update local store with only new tracks
      useMusicStore.getState().addMusicBatch(savedMusics);

      setImportModalVisible(false);
    } catch (err: any) {
      setImportError(err.message || 'Failed to import playlist');
    } finally {
      setImportLoading(false);
    }
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
          ListEmptyComponent={() => (
            <SearchEmptyState
              loading={loading}
              error={error}
              searchQuery={searchQuery}
              tracksLength={tracks.length}
              searchMode={searchMode}
              onImportPlaylist={handleOpenImportModal}
              hasSearched={hasSearched} // <-- Pass this
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
          playlistLink={playlistLink}
          importRating={importRating}
          importLoading={importLoading}
          importError={importError}
          onChangeLink={setPlaylistLink}
          onChangeRating={setImportRating}
          onCancel={() => setImportModalVisible(false)}
          onImport={handleImportPlaylist}
        />
      </SafeAreaView>
    </ErrorBoundary>
  );
}