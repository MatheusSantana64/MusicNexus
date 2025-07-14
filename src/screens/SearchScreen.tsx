// src/screens/SearchScreen.tsx
// Screen for searching music online (Deezer API)
import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DeezerTrack, SearchMode } from '../types/music';
import { useSearch } from '../hooks/useSearch';
import { useAlbumSaver } from '../hooks/useAlbumSaver';
import { useTrackSaver } from '../hooks/useTrackSaver';
import { MusicItem } from '../components/MusicItem';
import { SearchFilters } from '../components/SearchFilters';
import { SearchEmptyState } from '../components/SearchEmptyState';
import { useMusicStore } from '../store/musicStore';
import { searchStyles as styles } from '../styles/screens/SearchScreen.styles';

// === CONSTANTS ===
const MIN_SEARCH_LENGTH = 3;

export default function SearchScreen() {
  // === STATE & HOOKS ===
  const [searchQuery, setSearchQuery] = useState('');
  const { tracks, loading, error, searchMode, searchTracks, setSearchMode } = useSearch();
  const { isMusicSaved } = useMusicStore();

  // === SIMPLE HOOKS WITH INTERNAL STATE ===
  const { isSaving: isAlbumSaving, handleSaveAlbum } = useAlbumSaver();
  const { isSaving: isTrackSaving, handleTrackPress } = useTrackSaver();

  // === COMPUTED VALUES ===
  const albumGroups = useMemo(() => {
    if (searchMode !== 'album' || tracks.length === 0) return [];

    const groups = tracks.reduce((acc, track) => {
      const albumId = track.album.id;
      if (!acc[albumId]) {
        acc[albumId] = {
          album: track.album,
          artist: track.artist,
          tracks: [],
          releaseDate: track.album.release_date,
        };
      }
      acc[albumId].tracks.push(track);
      return acc;
    }, {} as Record<string, { album: any; artist: any; tracks: DeezerTrack[]; releaseDate: string }>);

    return Object.entries(groups)
      .map(([albumId, group]) => ({
        albumId,
        ...group,
      }))
      .sort((a, b) => {
        if (a.releaseDate && b.releaseDate) {
          const dateA = new Date(a.releaseDate).getTime();
          const dateB = new Date(b.releaseDate).getTime();
          if (dateB !== dateA) return dateB - dateA;
        }
        return a.album.title.localeCompare(b.album.title);
      })
      .map(group => ({
        ...group,
        tracks: group.tracks.sort((a, b) => {
          const diskA = a.disk_number || 1;
          const diskB = b.disk_number || 1;
          if (diskA !== diskB) return diskA - diskB;
          
          const trackA = a.track_position || 999;
          const trackB = b.track_position || 999;
          return trackA - trackB;
        }),
      }));
  }, [tracks, searchMode]);

  // === HANDLERS - SEARCH ===
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

  // === RENDER FUNCTIONS - FLATLIST ===
  const renderTrackItem = useCallback(({ item }: { item: DeezerTrack }) => (
    <MusicItem 
      music={item} 
      onPress={handleTrackPress}
      isLoading={isTrackSaving(item.id)}
    />
  ), [handleTrackPress, isTrackSaving]);

  const renderAlbumHeader = useCallback((albumGroup: typeof albumGroups[0]) => {
    const { albumId, album, artist, tracks: albumTracks } = albumGroup;
    const isLoading = isAlbumSaving(albumId);
    const savedCount = albumTracks.filter(track => isMusicSaved(track.id)).length;
    const totalCount = albumTracks.length;
    
    return (
      <View style={styles.albumHeader}>
        <View style={styles.albumInfo}>
          <Text style={styles.albumTitle} numberOfLines={1}>
            💿 {album.title}
          </Text>
          <Text style={styles.albumArtist} numberOfLines={1}>
            {artist.name} • {totalCount} faixas
            {savedCount > 0 && (
              <Text style={styles.savedCount}> • {savedCount} salvas</Text>
            )}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.saveAlbumButton, isLoading && styles.saveAlbumButtonLoading]}
          onPress={() => !isLoading && handleSaveAlbum(albumGroup)}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.saveAlbumButtonText}>
              {savedCount === totalCount ? 'Salvo' : 'Salvar Álbum'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    );
  }, [handleSaveAlbum, isAlbumSaving, isMusicSaved]);

  // === RENDER FUNCTIONS - UI COMPONENTS ===
  const renderSearchBar = () => (
    <View style={styles.searchContainer}>
      <TextInput
        style={styles.searchInput}
        placeholder="Pesquisar músicas..."
        placeholderTextColor={styles.placeholderText.color}
        value={searchQuery}
        onChangeText={handleSearch}
        autoCorrect={false}
        clearButtonMode="while-editing"
      />
      {loading && (
        <ActivityIndicator 
          size="small" 
          color="#007AFF"
        />
      )}
      <SearchFilters 
        currentMode={searchMode}
        onModeChange={handleModeChange}
      />
    </View>
  );

  const renderTrackList = () => {
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
  };

  // === MAIN RENDER ===
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {renderSearchBar()}
      {renderTrackList()}
    </SafeAreaView>
  );
}