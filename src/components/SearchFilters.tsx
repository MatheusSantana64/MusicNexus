import React from 'react';
import {
  View,
  TouchableOpacity,
  Text,
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

  return (
    <View style={styles.iconButtonsContainer}>
      {searchModes.map((mode) => (
        <TouchableOpacity
          key={mode}
          style={[
            styles.iconButton,
            currentMode === mode && styles.iconButtonActive
          ]}
          onPress={() => onModeChange(mode)}
        >
          <Text style={[
            styles.iconButtonText,
            currentMode === mode && styles.iconButtonTextActive
          ]}>
            {getModeIcon(mode)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}