import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SavedMusic } from '../types/music';
import { MusicItem } from '../components/MusicItem';
import { useMusicStore } from '../store/musicStore';
import { libraryStyles as styles } from '../styles/screens/LibraryScreen.styles';

type SortMode = 'recent' | 'rating' | 'release' | 'alphabetical' | 'album' | 'artist';

// === CONSTANTS & UTILITIES ===
const SORT_MODES: Record<SortMode, string> = {
  recent: 'Recent',
  rating: 'Rating', 
  release: 'Release',
  alphabetical: 'Alphabetical',
  album: 'Album',
  artist: 'Artist',
};

const SORT_STRATEGIES = {
  recent: (a: SavedMusic, b: SavedMusic) => 
    new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime(),
  rating: (a: SavedMusic, b: SavedMusic) => b.rating - a.rating,
  release: (a: SavedMusic, b: SavedMusic) => 
    new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime(),
  alphabetical: (a: SavedMusic, b: SavedMusic) => a.title.localeCompare(b.title),
  album: (a: SavedMusic, b: SavedMusic) => a.album.localeCompare(b.album),
  artist: (a: SavedMusic, b: SavedMusic) => a.artist.localeCompare(b.artist),
};

const getSecondarySort = (a: SavedMusic, b: SavedMusic): number => {
  return new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime() ||
         a.artist.localeCompare(b.artist) ||
         a.album.localeCompare(b.album) ||
         a.diskNumber - b.diskNumber ||
         a.trackPosition - b.trackPosition;
};

const filterMusic = (music: SavedMusic[], query: string) => {
  if (!query.trim()) return music;
  
  const searchTerm = query.toLowerCase().trim();
  return music.filter(item => 
    item.title.toLowerCase().includes(searchTerm) ||
    item.artist.toLowerCase().includes(searchTerm) ||
    item.album.toLowerCase().includes(searchTerm)
  );
};

const sortMusic = (music: SavedMusic[], mode: SortMode) => {
  return [...music].sort((a, b) => {
    const primarySort = SORT_STRATEGIES[mode](a, b);
    return primarySort || getSecondarySort(a, b);
  });
};

export default function LibraryScreen() {
  // === STATE & STORE ===
  const [sortMode, setSortMode] = useState<SortMode>('recent');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Use Zustand store instead of hooks
  const {
    savedMusic,
    loading,
    error,
    refreshing,
    updateRating,
    deleteMusic,
    refresh,
  } = useMusicStore();

  // === HANDLERS ===
  const showAlert = useCallback((title: string, message: string) => {
    Alert.alert(title, message);
  }, []);

  const handleRatingPrompt = useCallback((music: SavedMusic) => {
    Alert.prompt(
      'Atualizar Avaliação',
      `Digite uma nova nota de 1 a 10 para "${music.title}"`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Salvar', 
          onPress: async (rating) => {
            const numRating = parseInt(rating || '0');
            
            if (numRating < 0 || numRating > 10) {
              showAlert('Erro', 'Digite uma nota entre 0 e 10');
              return;
            }

            const success = await updateRating(music.firebaseId!, numRating);
            showAlert(
              success ? 'Sucesso' : 'Erro',
              success ? 'Avaliação atualizada!' : 'Não foi possível atualizar a avaliação'
            );
          }
        },
      ],
      'plain-text',
      music.rating.toString(),
      'numeric'
    );
  }, [updateRating, showAlert]);

  const handleDeletePrompt = useCallback((music: SavedMusic) => {
    Alert.alert(
      'Remover Música',
      `Tem certeza que deseja remover "${music.title}" da sua biblioteca?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            const success = await deleteMusic(music.firebaseId!);
            
            showAlert(
              success ? 'Sucesso' : 'Erro',
              success ? 'Música removida da biblioteca' : 'Não foi possível remover a música'
            );
          },
        },
      ]
    );
  }, [deleteMusic, showAlert]);

  // === COMPUTED VALUES ===
  const processedMusic = useMemo(() => {
    const filtered = filterMusic(savedMusic, searchQuery);
    return sortMusic(filtered, sortMode);
  }, [savedMusic, searchQuery, sortMode]);

  const hasMusic = savedMusic.length > 0;
  const hasSearchResults = searchQuery.trim() && processedMusic.length === 0 && hasMusic;

  // === RENDER FUNCTIONS ===
  const renderItem = useCallback(({ item }: { item: SavedMusic }) => (
    <MusicItem
      music={item}
      onPress={handleRatingPrompt}
      onLongPress={(music) => {
        Alert.alert(
          music.title,
          `Options for "${music.title}"`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Rate', onPress: () => handleRatingPrompt(music as SavedMusic) },
            { text: 'Delete', style: 'destructive', onPress: () => handleDeletePrompt(music as SavedMusic) },
          ]
        );
      }}
    />
  ), [handleRatingPrompt, handleDeletePrompt]);

  const renderSearchBar = () => (
    <View style={styles.searchContainer}>
      <TextInput
        style={styles.searchInput}
        placeholder="Buscar na biblioteca..."
        placeholderTextColor={styles.placeholderText.color}
        value={searchQuery}
        onChangeText={setSearchQuery}
        autoCorrect={false}
        clearButtonMode="while-editing"
      />
    </View>
  );

  const renderSortHeader = () => (
    <View style={styles.sortHeader}>
      <Text style={styles.sortLabel}>Sort by:</Text>
      {searchQuery.trim() && (
        <Text style={styles.resultCount}>
          {processedMusic.length} de {savedMusic.length} músicas
        </Text>
      )}
    </View>
  );

  const renderSortButton = (mode: SortMode) => (
    <TouchableOpacity
      key={mode}
      style={[styles.sortButton, sortMode === mode && styles.sortButtonActive]}
      onPress={() => setSortMode(mode)}
    >
      <Text style={[
        styles.sortButtonText,
        sortMode === mode && styles.sortButtonTextActive
      ]}>
        {SORT_MODES[mode]}
      </Text>
    </TouchableOpacity>
  );

  const renderSortButtons = () => (
    <View style={styles.sortContainer}>
      {renderSortHeader()}
      <View style={styles.sortButtons}>
        {(Object.keys(SORT_MODES) as SortMode[]).map(renderSortButton)}
      </View>
    </View>
  );

  const renderEmptyState = () => {
    const states = {
      loading: (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Carregando biblioteca...</Text>
        </View>
      ),
      error: (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={refresh}>
            <Text style={styles.retryButtonText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      ),
      noResults: (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyTitle}>🔍 Nenhum resultado</Text>
          <Text style={styles.emptyText}>
            Não encontramos nenhuma música com "{searchQuery}".{'\n'}
            Tente pesquisar por título, artista ou álbum.
          </Text>
          <TouchableOpacity 
            style={styles.clearSearchButton} 
            onPress={() => setSearchQuery('')}
          >
            <Text style={styles.clearSearchButtonText}>Limpar pesquisa</Text>
          </TouchableOpacity>
        </View>
      ),
      empty: (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyTitle}>🎵 Biblioteca Vazia</Text>
          <Text style={styles.emptyText}>
            Você ainda não salvou nenhuma música.{'\n'}
            Vá para a aba de pesquisa e comece a adicionar suas músicas favoritas!
          </Text>
        </View>
      )
    };

    if (loading) return states.loading;
    if (error) return states.error;
    if (hasSearchResults) return states.noResults;
    if (!hasMusic) return states.empty;
    return null;
  };

  // === MAIN RENDER ===
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {hasMusic && renderSearchBar()}
      {hasMusic && renderSortButtons()}

      <FlatList
        data={processedMusic}
        keyExtractor={(item) => item.firebaseId!}
        renderItem={renderItem}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor="#007AFF"
          />
        }
        removeClippedSubviews
        maxToRenderPerBatch={10}
        windowSize={10}
      />
    </SafeAreaView>
  );
}
