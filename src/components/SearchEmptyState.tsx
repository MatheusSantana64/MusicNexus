import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { SearchMode } from '../types/music';
import { searchStyles as styles } from '../styles/screens/SearchScreen.styles';

interface SearchEmptyStateProps {
  loading: boolean;
  error: string | null;
  searchQuery: string;
  tracksLength: number;
  searchMode: SearchMode;
}

export function SearchEmptyState({ loading, error, searchQuery, tracksLength, searchMode }: SearchEmptyStateProps) {
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

  if (tracksLength === 0 && searchQuery.length > 2) {
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
}