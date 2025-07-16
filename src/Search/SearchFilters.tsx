// src/components/SearchFilters.tsx
// Component for search mode filters in the SearchScreen
import React from 'react';
import {
  View,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SearchMode } from '../types';
import { searchFiltersStyles as styles } from './styles/SearchFilters.styles';

interface SearchFiltersProps {
  currentMode: SearchMode;
  onModeChange: (mode: SearchMode) => void;
}

export function SearchFilters({ currentMode, onModeChange }: SearchFiltersProps) {
  const searchModes: SearchMode[] = ['album', 'quick'];

  const getModeIcon = (mode: SearchMode): keyof typeof Ionicons.glyphMap => {
    switch (mode) {
      case 'album':
        return 'disc-sharp';
      case 'quick':
        return 'flash-outline';
      default:
        return 'disc-outline';
    }
  };

  return (
    <View style={styles.iconButtonsContainer}>
      {searchModes.map((mode) => (
        <TouchableOpacity // Button for each search mode
          key={mode}
          style={[
            styles.iconButton,
            currentMode === mode && styles.iconButtonActive
          ]}
          onPress={() => onModeChange(mode)}
        >
          <Ionicons
            name={getModeIcon(mode)}
            size={currentMode === mode ? 24 : 16}
            color={currentMode === mode ? styles.iconButtonTextActive.color : styles.iconButtonText.color}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
}