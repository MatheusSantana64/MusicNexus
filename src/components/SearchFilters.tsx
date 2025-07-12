import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SearchMode } from '../types/music';
import { DeezerService } from '../services/deezerService';

interface SearchFiltersProps {
  currentMode: SearchMode;
  onModeChange: (mode: SearchMode) => void;
}

export function SearchFilters({ currentMode, onModeChange }: SearchFiltersProps) {
  const searchModes: SearchMode[] = ['album', 'quick'];

  const getModeIcon = (mode: SearchMode): string => {
    switch (mode) {
      case 'album':
        return '💿';
      case 'quick':
        return '⚡';
      default:
        return '💿';
    }
  };

  const getModeDescription = (mode: SearchMode): string => {
    switch (mode) {
      case 'album':
        return 'Álbuns completos';
      case 'quick':
        return 'Busca rápida';
      default:
        return 'Álbuns completos';
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Modo de pesquisa:</Text>
      <View style={styles.filtersRow}>
        {searchModes.map((mode) => (
          <TouchableOpacity
            key={mode}
            style={[
              styles.filterButton,
              currentMode === mode && styles.filterButtonActive
            ]}
            onPress={() => onModeChange(mode)}
          >
            <Text style={styles.filterIcon}>
              {getModeIcon(mode)}
            </Text>
            <Text style={[
              styles.filterText,
              currentMode === mode && styles.filterTextActive
            ]}>
              {getModeDescription(mode)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      
      {/* Descrição do modo ativo */}
      <Text style={styles.modeDescription}>
        {currentMode === 'album' 
          ? '📅 Mostra álbuns completos ordenados por data de lançamento (mais recentes primeiro)'
          : '⚡ Busca tradicional do Deezer por relevância e popularidade'
        }
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 8,
  },
  filtersRow: {
    flexDirection: 'row',
    gap: 12,
  },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  filterIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#495057',
    textAlign: 'center',
  },
  filterTextActive: {
    color: '#fff',
  },
  modeDescription: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 16,
    fontStyle: 'italic',
  },
});