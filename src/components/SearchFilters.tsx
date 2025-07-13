import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
} from 'react-native';
import { SearchMode } from '../types/music';
import { searchFiltersStyles as styles } from '../styles/components/SearchFilters.styles';

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
        return 'Albums';
      case 'quick':
        return 'Quick Search';
      default:
        return 'Albums';
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