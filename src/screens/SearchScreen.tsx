import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DeezerTrack, SearchMode } from '../types/music';
import { useSearch } from '../hooks/useSearch';
import { MusicItem } from '../components/MusicItem';
import { SearchFilters } from '../components/SearchFilters';
import { saveMusic } from '../services/musicService';
import { useGlobalLibrary } from '../hooks/useGlobalLibrary';
import { searchStyles as styles } from '../styles/screens/SearchScreen.styles';

// === CONSTANTS ===
const RATING_RANGE = { MIN: 1, MAX: 10 } as const;
const MIN_SEARCH_LENGTH = 3;

export default function SearchScreen() {
  // === STATE & HOOKS ===
  const [searchQuery, setSearchQuery] = useState('');
  const [savingTrackId, setSavingTrackId] = useState<string | null>(null);
  const { tracks, loading, error, searchMode, searchTracks, setSearchMode } = useSearch();
  const { isMusicSaved, getSavedMusicById } = useGlobalLibrary();

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
  }, [showAlert]);

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
          style={styles.searchLoading}
        />
      )}
    </View>
  );

  const renderFilters = () => (
    <SearchFilters 
      currentMode={searchMode}
      onModeChange={handleModeChange}
    />
  );

  const renderTrackList = () => (
    <FlatList
      data={tracks}
      keyExtractor={keyExtractor}
      renderItem={renderTrackItem}
      ListEmptyComponent={renderEmptyState}
      showsVerticalScrollIndicator={false}
      removeClippedSubviews={true}
      maxToRenderPerBatch={10}
      windowSize={10}
    />
  );

  // === MAIN RENDER ===
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {renderSearchBar()}
      {renderFilters()}
      {renderTrackList()}
    </SafeAreaView>
  );
}