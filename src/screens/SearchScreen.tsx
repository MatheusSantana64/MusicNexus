import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DeezerTrack, SearchMode } from '../types/music';
import { useSearch } from '../hooks/useSearch';
import { MusicItem } from '../components/MusicItem';
import { SearchFilters } from '../components/SearchFilters';
import { saveMusic, saveMusicBatch } from '../services/musicService';
import { useGlobalLibrary } from '../hooks/useGlobalLibrary';
import { searchStyles as styles } from '../styles/screens/SearchScreen.styles';

// === CONSTANTS ===
const RATING_RANGE = { MIN: 1, MAX: 10 } as const;
const MIN_SEARCH_LENGTH = 3;

export default function SearchScreen() {
  // === STATE & HOOKS ===
  const [searchQuery, setSearchQuery] = useState('');
  const [savingTrackId, setSavingTrackId] = useState<string | null>(null);
  const [savingAlbumId, setSavingAlbumId] = useState<string | null>(null);
  const { tracks, loading, error, searchMode, searchTracks, setSearchMode } = useSearch();
  const { isMusicSaved, getSavedMusicById, loadMusic } = useGlobalLibrary();

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
          // Preserve the release date for sorting
          releaseDate: track.album.release_date,
        };
      }
      acc[albumId].tracks.push(track);
      return acc;
    }, {} as Record<string, { album: any; artist: any; tracks: DeezerTrack[]; releaseDate: string }>);

    // Convert to array and sort by release date (newest first), then process
    return Object.entries(groups)
      .map(([albumId, group]) => ({
        albumId,
        ...group,
      }))
      .sort((a, b) => {
        // Sort by release date (newest first)
        if (a.releaseDate && b.releaseDate) {
          const dateA = new Date(a.releaseDate).getTime();
          const dateB = new Date(b.releaseDate).getTime();
          if (dateB !== dateA) return dateB - dateA; // Newest first
        }
        
        // Fallback to album title if dates are equal or missing
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
    // Se há uma query ativa, refazer a busca com o novo modo
    if (searchQuery.length >= MIN_SEARCH_LENGTH) {
      await searchTracks(searchQuery, mode);
    }
  }, [setSearchMode, searchTracks, searchQuery]);

  // === HANDLERS - ALBUM ACTIONS ===
  const handleSaveAlbum = useCallback((albumGroup: typeof albumGroups[0]) => {
    const { albumId, album, artist, tracks: albumTracks } = albumGroup;
    
    // Check how many tracks are already saved
    const savedTracks = albumTracks.filter(track => isMusicSaved(track.id));
    const unsavedTracks = albumTracks.filter(track => !isMusicSaved(track.id));
    
    let message = `Salvar ${albumTracks.length} faixas do álbum "${album.title}" de ${artist.name}?`;
    
    if (savedTracks.length > 0) {
      message += `\n\n⚠️ ${savedTracks.length} faixa(s) já estão salvas e serão ignoradas.`;
    }
    
    if (unsavedTracks.length === 0) {
      Alert.alert(
        'Álbum já salvo',
        `Todas as faixas de "${album.title}" já estão na sua biblioteca.`,
        [{ text: 'OK', style: 'default' }]
      );
      return;
    }

    Alert.alert(
      'Salvar Álbum Completo',
      message,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Salvar sem nota', onPress: () => saveAlbumTracks(albumGroup, 0) },
        { text: 'Avaliar e salvar', onPress: () => showAlbumRatingDialog(albumGroup) },
      ]
    );
  }, [isMusicSaved]);

  const saveAlbumTracks = useCallback(async (albumGroup: typeof albumGroups[0], rating: number) => {
    const { albumId, tracks: albumTracks } = albumGroup;
    setSavingAlbumId(albumId);
    
    try {
      // Filter out already saved tracks
      const unsavedTracks = albumTracks.filter(track => !isMusicSaved(track.id));
      
      if (unsavedTracks.length === 0) {
        showAlert('Aviso', 'Todas as faixas já estão salvas na biblioteca.');
        return;
      }

      const savedIds = await saveMusicBatch(unsavedTracks, rating);
      
      // Refresh the library data to update the UI
      await loadMusic();
      
      const message = rating === 0 
        ? `${savedIds.length} faixas salvas sem nota!`
        : `${savedIds.length} faixas salvas com nota ${rating}!`;
      
      showAlert('Sucesso!', message);
    } catch (error) {
      showAlert('Erro', 'Não foi possível salvar todas as faixas. Tente novamente.');
      console.error('Error saving album tracks:', error);
    } finally {
      setSavingAlbumId(null);
    }
  }, [isMusicSaved, loadMusic]);

  const showAlbumRatingDialog = useCallback((albumGroup: typeof albumGroups[0]) => {
    Alert.prompt(
      'Avaliar Álbum',
      `Digite uma nota de ${RATING_RANGE.MIN} a ${RATING_RANGE.MAX} para todas as faixas de "${albumGroup.album.title}"`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Salvar',
          onPress: (rating) => {
            const numRating = parseInt(rating || '0');
            
            if (numRating < RATING_RANGE.MIN || numRating > RATING_RANGE.MAX) {
              showAlert('Erro', `Por favor, digite uma nota entre ${RATING_RANGE.MIN} e ${RATING_RANGE.MAX}`);
              return;
            }

            saveAlbumTracks(albumGroup, numRating);
          },
        },
      ],
      'plain-text',
      '',
      'numeric'
    );
  }, [saveAlbumTracks]);

  // === HANDLERS - TRACK ACTIONS ===
  const showAlert = useCallback((title: string, message: string) => {
    Alert.alert(title, message);
  }, []);

  const handleTrackPress = useCallback((track: DeezerTrack) => {
    const isAlreadySaved = isMusicSaved(track.id);
    const savedMusicData = getSavedMusicById(track.id);
    
    const releaseYear = track.album?.release_date ? 
      new Date(track.album.release_date).getFullYear() : 'Ano desconhecido';
    
    if (isAlreadySaved && savedMusicData) {
      // Música já está salva - mostrar confirmação
      Alert.alert(
        '⚠️ Música já salva',
        `"${track.title}" já está na sua biblioteca com nota ${savedMusicData.rating === 0 ? 'sem nota' : savedMusicData.rating}.\n\nDeseja salvar novamente?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { 
            text: 'Salvar novamente', 
            style: 'default',
            onPress: () => showSaveOptionsForExistingTrack(track)
          },
        ]
      );
    } else {
      // Música não está salva - fluxo normal
      Alert.alert(
        track.title,
        `Artista: ${track.artist.name}\nÁlbum: ${track.album.title}\nAno: ${releaseYear}`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Salvar sem nota', onPress: () => saveMusicWithRating(track, 0) },
          { text: 'Avaliar e salvar', onPress: () => showRatingDialog(track) },
        ]
      );
    }
  }, [isMusicSaved, getSavedMusicById]);

  const showSaveOptionsForExistingTrack = useCallback((track: DeezerTrack) => {
    Alert.alert(
      'Salvar novamente',
      `Como deseja salvar "${track.title}" novamente?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Salvar sem nota', onPress: () => saveMusicWithRating(track, 0) },
        { text: 'Avaliar e salvar', onPress: () => showRatingDialog(track) },
      ]
    );
  }, []);

  const saveMusicWithRating = useCallback(async (track: DeezerTrack, rating: number) => {
    setSavingTrackId(track.id);
    
    try {
      await saveMusic(track, { rating });
      
      // Refresh the library data to update the UI
      await loadMusic();
      
      const message = rating === 0 
        ? `Música "${track.title}" salva sem nota!`
        : `Música "${track.title}" salva com nota ${rating}!`;
      
      showAlert('Sucesso!', message);
    } catch (error) {
      showAlert('Erro', 'Não foi possível salvar a música. Tente novamente.');
      console.error('Error saving music:', error);
    } finally {
      setSavingTrackId(null);
    }
  }, [showAlert, loadMusic]);

  const showRatingDialog = useCallback((track: DeezerTrack) => {
    Alert.prompt(
      'Avaliar Música',
      `Digite uma nota de ${RATING_RANGE.MIN} a ${RATING_RANGE.MAX} para "${track.title}"`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Salvar',
          onPress: (rating) => {
            const numRating = parseInt(rating || '0');
            
            if (numRating < RATING_RANGE.MIN || numRating > RATING_RANGE.MAX) {
              showAlert('Erro', `Por favor, digite uma nota entre ${RATING_RANGE.MIN} e ${RATING_RANGE.MAX}`);
              return;
            }

            saveMusicWithRating(track, numRating);
          },
        },
      ],
      'plain-text',
      '',
      'numeric'
    );
  }, [saveMusicWithRating, showAlert]);

  // === RENDER FUNCTIONS - FLATLIST ===
  const renderTrackItem = useCallback(({ item }: { item: DeezerTrack }) => (
    <MusicItem 
      music={item} 
      onPress={handleTrackPress}
      isLoading={savingTrackId === item.id}
    />
  ), [handleTrackPress, savingTrackId]);

  const keyExtractor = useCallback((item: DeezerTrack) => item.id, []);

  const renderAlbumHeader = useCallback((albumGroup: typeof albumGroups[0]) => {
    const { albumId, album, artist, tracks: albumTracks } = albumGroup;
    const isLoading = savingAlbumId === albumId;
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
  }, [handleSaveAlbum, savingAlbumId, isMusicSaved]);

  const renderEmptyState = useCallback(() => {
    const states = {
      loading: (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>
            {searchMode === 'album' ? 'Buscando álbuns...' : 'Pesquisa rápida...'}
          </Text>
        </View>
      ),
      error: (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ),
      initial: (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>
            Digite o nome de uma música, artista ou álbum para pesquisar
          </Text>
          <Text style={styles.hintText}>
            💡 Use os filtros acima para escolher o tipo de pesquisa
          </Text>
        </View>
      ),
      noResults: (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>
            Nenhum resultado encontrado para "{searchQuery}"
          </Text>
          <Text style={styles.hintText}>
            Tente mudar o modo de pesquisa ou usar termos diferentes
          </Text>
        </View>
      )
    };

    if (loading) return states.loading;
    if (error) return states.error;
    if (searchQuery.length === 0) return states.initial;
    if (tracks.length === 0 && searchQuery.length > 2) return states.noResults;
    return null;
  }, [loading, error, searchQuery, tracks.length, searchMode]);

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
    // Create a flat list with album headers interspersed
    const flatData: Array<{ type: 'album' | 'track'; data: any }> = [];
    
    if (searchMode === 'album' && albumGroups.length > 0) {
      // Group by album with headers
      albumGroups.forEach(albumGroup => {
        flatData.push({ type: 'album', data: albumGroup });
        albumGroup.tracks.forEach(track => {
          flatData.push({ type: 'track', data: track });
        });
      });
    } else {
      // Simple track list for quick mode or when no album groups
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
        ListEmptyComponent={renderEmptyState}
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