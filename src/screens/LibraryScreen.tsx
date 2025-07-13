import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SavedMusic } from '../types/music';
import { SavedMusicItem } from '../components/SavedMusicItem';
import { useLibrary } from '../hooks/useLibrary';

type SortMode = 'recent' | 'rating' | 'release' | 'alphabetical' | 'album' | 'artist';

export default function LibraryScreen() {
  const [sortMode, setSortMode] = useState<SortMode>('recent');
  const [searchQuery, setSearchQuery] = useState('');
  const { 
    savedMusic, 
    loading, 
    error, 
    refreshing, 
    updateRating, 
    deleteMusic: deleteMusicFromLibrary, 
    refresh 
  } = useLibrary();

  const handleUpdateRating = useCallback(async (music: SavedMusic) => {
    Alert.prompt(
      'Atualizar Avaliação',
      `Digite uma nova nota de 1 a 10 para "${music.title}"`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Salvar',
          onPress: async (rating) => {
            const numRating = parseInt(rating || '0');
            if (numRating >= 0 && numRating <= 10) {
              const success = await updateRating(music.firebaseId!, numRating);
              if (success) {
                Alert.alert('Sucesso', 'Avaliação atualizada!');
              } else {
                Alert.alert('Erro', 'Não foi possível atualizar a avaliação');
              }
            } else {
              Alert.alert('Erro', 'Digite uma nota entre 0 e 10');
            }
          },
        },
      ],
      'plain-text',
      music.rating.toString(),
      'numeric'
    );
  }, [updateRating]);

  const handleDeleteMusic = useCallback(async (music: SavedMusic) => {
    Alert.alert(
      'Remover Música',
      `Tem certeza que deseja remover "${music.title}" da sua biblioteca?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            const success = await deleteMusicFromLibrary(music.firebaseId!);
            if (success) {
              Alert.alert('Sucesso', 'Música removida da biblioteca');
            } else {
              Alert.alert('Erro', 'Não foi possível remover a música');
            }
          },
        },
      ]
    );
  }, [deleteMusicFromLibrary]);

  // Filter music based on search query
  const filteredMusic = useMemo(() => {
    if (!searchQuery.trim()) {
      return savedMusic;
    }

    const query = searchQuery.toLowerCase().trim();
    return savedMusic.filter(music => 
      music.title.toLowerCase().includes(query) ||
      music.artist.toLowerCase().includes(query) ||
      music.album.toLowerCase().includes(query)
    );
  }, [savedMusic, searchQuery]);

  const sortedMusic = useCallback(() => {
    const sorted = [...filteredMusic];
    
    // Helper function for secondary sorting
    const secondarySort = (a: SavedMusic, b: SavedMusic): number => {
      // 1. Release date (most recent first)
      const dateA = new Date(a.releaseDate).getTime();
      const dateB = new Date(b.releaseDate).getTime();
      if (dateA !== dateB) return dateB - dateA;
      
      // 2. Artist name (alphabetical)
      const artistComparison = a.artist.localeCompare(b.artist);
      if (artistComparison !== 0) return artistComparison;
      
      // 3. Album name (alphabetical)
      const albumComparison = a.album.localeCompare(b.album);
      if (albumComparison !== 0) return albumComparison;
      
      // 4. Track position
      return a.trackPosition - b.trackPosition;
    };
    
    switch (sortMode) {
      case 'recent':
        return sorted.sort((a, b) => {
          const savedDateComparison = new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime();
          return savedDateComparison !== 0 ? savedDateComparison : secondarySort(a, b);
        });
        
      case 'rating':
        return sorted.sort((a, b) => {
          const ratingComparison = b.rating - a.rating;
          return ratingComparison !== 0 ? ratingComparison : secondarySort(a, b);
        });
        
      case 'release':
        return sorted.sort((a, b) => {
          const dateA = new Date(a.releaseDate).getTime();
          const dateB = new Date(b.releaseDate).getTime();
          const dateComparison = dateB - dateA;
          if (dateComparison !== 0) return dateComparison;
          
          // For same release date, continue with artist, album, track order
          const artistComparison = a.artist.localeCompare(b.artist);
          if (artistComparison !== 0) return artistComparison;
          
          const albumComparison = a.album.localeCompare(b.album);
          if (albumComparison !== 0) return albumComparison;
          
          if (a.diskNumber !== b.diskNumber) return a.diskNumber - b.diskNumber;
          
          return a.trackPosition - b.trackPosition;
        });
        
      case 'alphabetical':
        return sorted.sort((a, b) => {
          const titleComparison = a.title.localeCompare(b.title);
          return titleComparison !== 0 ? titleComparison : secondarySort(a, b);
        });
        
      case 'album':
        return sorted.sort((a, b) => {
          // Primary: Album name
          const albumComparison = a.album.localeCompare(b.album);
          if (albumComparison !== 0) return albumComparison;
          
          // Secondary: Release date (most recent first)
          const dateA = new Date(a.releaseDate).getTime();
          const dateB = new Date(b.releaseDate).getTime();
          if (dateA !== dateB) return dateB - dateA;
          
          // Tertiary: Artist name
          const artistComparison = a.artist.localeCompare(b.artist);
          if (artistComparison !== 0) return artistComparison;
          
          // Quaternary: Disk number
          if (a.diskNumber !== b.diskNumber) return a.diskNumber - b.diskNumber;
          
          // Final: Track position
          return a.trackPosition - b.trackPosition;
        });
        
      case 'artist':
        return sorted.sort((a, b) => {
          // Primary: Artist name
          const artistComparison = a.artist.localeCompare(b.artist);
          if (artistComparison !== 0) return artistComparison;
          
          // Secondary: Release date (most recent first)
          const dateA = new Date(a.releaseDate).getTime();
          const dateB = new Date(b.releaseDate).getTime();
          if (dateA !== dateB) return dateB - dateA;
          
          // Tertiary: Album name
          const albumComparison = a.album.localeCompare(b.album);
          if (albumComparison !== 0) return albumComparison;
          
          // Quaternary: Disk number
          if (a.diskNumber !== b.diskNumber) return a.diskNumber - b.diskNumber;
          
          // Final: Track position
          return a.trackPosition - b.trackPosition;
        });
        
      default:
        return sorted;
    }
  }, [filteredMusic, sortMode]);

  const getSortModeDescription = (mode: SortMode): string => {
    switch (mode) {
      case 'recent': return 'Recent';
      case 'rating': return 'Rating';
      case 'release': return 'Release';
      case 'alphabetical': return 'Alphabetical';
      case 'album': return 'Album';
      case 'artist': return 'Artist';
      default: return '';
    }
  };

  const renderSearchBar = () => (
    <View style={styles.searchContainer}>
      <TextInput
        style={styles.searchInput}
        placeholder="Buscar na biblioteca..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        autoCorrect={false}
        clearButtonMode="while-editing"
      />
    </View>
  );

  const renderSortButtons = () => (
    <View style={styles.sortContainer}>
      <View style={styles.sortHeader}>
        <Text style={styles.sortLabel}>Sort by:</Text>
        {searchQuery.trim() && (
          <Text style={styles.resultCount}>
            {filteredMusic.length} de {savedMusic.length} músicas
          </Text>
        )}
      </View>
      <View style={styles.sortButtons}>
        {(['recent', 'rating', 'release', 'alphabetical', 'album', 'artist'] as SortMode[]).map((mode) => (
          <TouchableOpacity
            key={mode}
            style={[
              styles.sortButton,
              sortMode === mode && styles.sortButtonActive
            ]}
            onPress={() => setSortMode(mode)}
          >
            <Text style={[
              styles.sortButtonText,
              sortMode === mode && styles.sortButtonTextActive
            ]}>
              {getSortModeDescription(mode).split(' ')[0]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderMusicItem = useCallback(({ item }: { item: SavedMusic }) => (
    <SavedMusicItem
      music={item}
      onUpdateRating={handleUpdateRating}
      onDelete={handleDeleteMusic}
    />
  ), [handleUpdateRating, handleDeleteMusic]);

  const keyExtractor = useCallback((item: SavedMusic) => item.firebaseId!, []);

  const renderEmptyState = () => {
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

    // Empty state for search results
    if (searchQuery.trim() && filteredMusic.length === 0 && savedMusic.length > 0) {
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

    // Empty state for empty library
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

    return null;
  };

  const sortedMusicList = sortedMusic();
  const hasMusic = savedMusic.length > 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {hasMusic && renderSearchBar()}
      {hasMusic && renderSortButtons()}

      <FlatList
        data={sortedMusicList}
        keyExtractor={keyExtractor}
        renderItem={renderMusicItem}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor="#007AFF"
          />
        }
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={10}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  searchContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  searchInput: {
    height: 44,
    backgroundColor: '#f8f9fa',
    borderRadius: 22,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  sortContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  sortHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sortLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
  },
  resultCount: {
    fontSize: 12,
    color: '#6c757d',
    fontStyle: 'italic',
  },
  sortButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap', // Allow buttons to wrap to next line
    gap: 8,
  },
  sortButton: {
    paddingHorizontal: 10, // Slightly smaller padding for more buttons
    paddingVertical: 6,
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#dee2e6',
    minWidth: 60, // Minimum width for consistency
  },
  sortButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  sortButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#495057',
  },
  sortButtonTextActive: {
    color: '#fff',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#dc3545',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#495057',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 16,
  },
  clearSearchButton: {
    backgroundColor: '#6c757d',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  clearSearchButtonText: {
    color: '#fff',
    fontWeight: '500',
    fontSize: 14,
  },
});
