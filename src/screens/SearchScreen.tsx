import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DeezerTrack, SearchMode } from '../types/music';
import { useSearch } from '../hooks/useSearch';
import { TrackItem } from '../components/TrackItem';
import { SearchFilters } from '../components/SearchFilters';
import { saveMusic } from '../services/musicService';

export default function SearchScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [savingTrackId, setSavingTrackId] = useState<string | null>(null);
  const { tracks, loading, error, searchMode, searchTracks, setSearchMode } = useSearch();

  const handleSearch = useCallback(async (text: string) => {
    setSearchQuery(text);
    await searchTracks(text);
  }, [searchTracks]);

  const handleModeChange = useCallback(async (mode: SearchMode) => {
    setSearchMode(mode);
    // Se há uma query ativa, refazer a busca com o novo modo
    if (searchQuery.length >= 3) {
      await searchTracks(searchQuery, mode);
    }
  }, [setSearchMode, searchTracks, searchQuery]);

  const handleTrackPress = useCallback((track: DeezerTrack) => {
    const releaseYear = track.album?.release_date ? 
      new Date(track.album.release_date).getFullYear() : 'Ano desconhecido';
    
    Alert.alert(
      track.title,
      `Artista: ${track.artist.name}\nÁlbum: ${track.album.title}\nAno: ${releaseYear}`,
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
      await saveMusic(track, rating);
      Alert.alert(
        'Sucesso!', 
        `Música "${track.title}" salva com nota ${rating}!`
      );
    } catch (error) {
      Alert.alert(
        'Erro', 
        'Não foi possível salvar a música. Tente novamente.'
      );
      console.error('Error saving music:', error);
    } finally {
      setSavingTrackId(null);
    }
  }, []);

  const showRatingDialog = useCallback((track: DeezerTrack) => {
    Alert.prompt(
      'Avaliar Música',
      `Digite uma nota de 1 a 10 para "${track.title}"`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Salvar',
          onPress: (rating) => {
            const numRating = parseInt(rating || '0');
            if (numRating >= 1 && numRating <= 10) {
              saveMusicWithRating(track, numRating);
            } else {
              Alert.alert('Erro', 'Por favor, digite uma nota entre 1 e 10');
            }
          },
        },
      ],
      'plain-text',
      '',
      'numeric'
    );
  }, [saveMusicWithRating]);

  const renderTrackItem = useCallback(({ item }: { item: DeezerTrack }) => (
    <TrackItem 
      track={item} 
      onPress={handleTrackPress}
      isLoading={savingTrackId === item.id}
    />
  ), [handleTrackPress, savingTrackId]);

  const keyExtractor = useCallback((item: DeezerTrack) => item.id, []);

  const renderEmptyState = () => {
    if (loading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>
            {searchMode === 'album' ? 'Buscando álbuns...' : 'Pesquisa rápida...'}
          </Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      );
    }

    if (searchQuery.length === 0) {
      return (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>
            Digite o nome de uma música, artista ou álbum para pesquisar
          </Text>
          <Text style={styles.hintText}>
            💡 Use os filtros acima para escolher o tipo de pesquisa
          </Text>
        </View>
      );
    }

    if (tracks.length === 0 && searchQuery.length > 2) {
      return (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>
            Nenhum resultado encontrado para "{searchQuery}"
          </Text>
          <Text style={styles.hintText}>
            Tente mudar o modo de pesquisa ou usar termos diferentes
          </Text>
        </View>
      );
    }

    return null;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Pesquisar músicas..."
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

      <SearchFilters 
        currentMode={searchMode}
        onModeChange={handleModeChange}
      />

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
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    height: 44,
    backgroundColor: '#f8f9fa',
    borderRadius: 22,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  searchLoading: {
    marginLeft: 12,
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
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 8,
  },
  hintText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
    fontStyle: 'italic',
  },
});