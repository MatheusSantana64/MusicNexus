// src/screens/LibraryScreen.tsx
// Screen for managing saved music
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

const SORT_OPTIONS: Record<SortMode, { label: string; sortFn: (a: SavedMusic, b: SavedMusic) => number }> = {
  recent: {
    label: 'Recent',
    sortFn: (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
  },
  rating: {
    label: 'Rating',
    sortFn: (a, b) => b.rating - a.rating
  },
  release: {
    label: 'Release',
    sortFn: (a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime()
  },
  alphabetical: {
    label: 'Title',
    sortFn: (a, b) => a.title.localeCompare(b.title)
  },
  album: {
    label: 'Album',
    sortFn: (a, b) => a.album.localeCompare(b.album)
  },
  artist: {
    label: 'Artist',
    sortFn: (a, b) => a.artist.localeCompare(b.artist)
  },
};

export default function LibraryScreen() {
  const [sortMode, setSortMode] = useState<SortMode>('recent');
  const [searchQuery, setSearchQuery] = useState('');
  
  const {
    savedMusic,
    loading,
    error,
    refreshing,
    updateRating,
    deleteMusic,
    refresh,
  } = useMusicStore();

  // Process music: filter + sort in one step
  const processedMusic = useMemo(() => {
    let filtered = savedMusic;
    
    // Filter by search query
    if (searchQuery.trim()) {
      const searchTerm = searchQuery.toLowerCase().trim();
      filtered = savedMusic.filter(item => 
        item.title.toLowerCase().includes(searchTerm) ||
        item.artist.toLowerCase().includes(searchTerm) ||
        item.album.toLowerCase().includes(searchTerm)
      );
    }
    
    // Sort
    return [...filtered].sort(SORT_OPTIONS[sortMode].sortFn);
  }, [savedMusic, searchQuery, sortMode]);

  // Unified handler for music actions
  const handleMusicAction = useCallback((music: SavedMusic, action: 'rate' | 'delete') => {
    if (action === 'rate') {
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
                Alert.alert('Erro', 'Digite uma nota entre 0 e 10');
                return;
              }

              const success = await updateRating(music.firebaseId!, numRating);
              if (!success) {
                Alert.alert('Erro', 'Não foi possível atualizar a avaliação');
              }
            }
          },
        ],
        'plain-text',
        music.rating.toString(),
        'numeric'
      );
    } else if (action === 'delete') {
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
              if (!success) {
                Alert.alert('Erro', 'Não foi possível remover a música');
              }
            },
          },
        ]
      );
    }
  }, [updateRating, deleteMusic]);

  const renderItem = useCallback(({ item }: { item: SavedMusic }) => (
    <MusicItem
      music={item}
      onPress={(music) => handleMusicAction(music as SavedMusic, 'rate')}
      onLongPress={(music) => {
        Alert.alert(
          music.title,
          `Options for "${music.title}"`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Rate', onPress: () => handleMusicAction(music as SavedMusic, 'rate') },
            { text: 'Delete', style: 'destructive', onPress: () => handleMusicAction(music as SavedMusic, 'delete') },
          ]
        );
      }}
    />
  ), [handleMusicAction]);

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Carregando biblioteca...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={refresh}>
            <Text style={styles.retryButtonText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (savedMusic.length === 0) {
      return (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyTitle}>🎵 Biblioteca Vazia</Text>
          <Text style={styles.emptyText}>
            Você ainda não salvou nenhuma música.{'\n'}
            Vá para a aba de pesquisa e comece a adicionar suas músicas favoritas!
          </Text>
        </View>
      );
    }

    if (searchQuery.trim() && processedMusic.length === 0) {
      return (
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
      );
    }

    return (
      <FlatList
        data={processedMusic}
        keyExtractor={(item) => item.firebaseId!}
        renderItem={renderItem}
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
    );
  };

  const hasMusic = savedMusic.length > 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {hasMusic && (
        <>
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
          
          <View style={styles.sortContainer}>
            <View style={styles.sortHeader}>
              <Text style={styles.sortLabel}>Sort by:</Text>
              {searchQuery.trim() && (
                <Text style={styles.resultCount}>
                  {processedMusic.length} de {savedMusic.length} músicas
                </Text>
              )}
            </View>
            <View style={styles.sortButtons}>
              {(Object.keys(SORT_OPTIONS) as SortMode[]).map((mode) => (
                <TouchableOpacity
                  key={mode}
                  style={[styles.sortButton, sortMode === mode && styles.sortButtonActive]}
                  onPress={() => setSortMode(mode)}
                >
                  <Text style={[
                    styles.sortButtonText,
                    sortMode === mode && styles.sortButtonTextActive
                  ]}>
                    {SORT_OPTIONS[mode].label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </>
      )}
      
      {renderContent()}
    </SafeAreaView>
  );
}
