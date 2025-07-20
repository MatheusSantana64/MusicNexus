// src/components/SearchFilters.tsx
// Component for search mode filters in the SearchScreen
import React from 'react';
import {
  View,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons'; // Add this import
import { SearchMode } from '../types';
import { searchFiltersStyles as styles } from './styles/SearchFilters.styles';

interface SearchFiltersProps {
  currentMode: SearchMode;
  onModeChange: (mode: SearchMode) => void;
}

export function SearchFilters({ currentMode, onModeChange }: SearchFiltersProps) {
  // Helper to get the other provider for the same type
  const getToggledMode = (mode: SearchMode): SearchMode => {
    if (mode === 'spotify_album') return 'deezer_album';
    if (mode === 'deezer_album') return 'spotify_album';
    if (mode === 'spotify_quick') return 'deezer_quick';
    if (mode === 'deezer_quick') return 'spotify_quick';
    return mode;
  };

  const searchModes: SearchMode[] = [
    'spotify_album',
    'spotify_quick',
    'deezer_album',
    'deezer_quick'
  ];

  const getModeIcon = (mode: SearchMode): React.ReactNode => {
    switch (mode) {
      case 'spotify_album':
        return <MaterialCommunityIcons name="album" size={currentMode === mode ? 24 : 16} color="#1DB954" />;
      case 'spotify_quick':
        return <MaterialCommunityIcons name="flash" size={currentMode === mode ? 24 : 16} color="#1DB954" />;
      case 'deezer_album':
        return <MaterialCommunityIcons name="album" size={currentMode === mode ? 24 : 16} color="#7c3aed" />;
      case 'deezer_quick':
        return <MaterialCommunityIcons name="flash" size={currentMode === mode ? 24 : 16} color="#7c3aed" />;
      default:
        return <Ionicons name="disc-outline" size={currentMode === mode ? 24 : 16} color="#888" />;
    }
  };

  // Only show two buttons: Album and Quick
  const mainModes: Array<{ type: 'album' | 'quick'; mode: SearchMode }> = [
    { type: 'album', mode: currentMode.includes('album') ? currentMode : 'spotify_album' },
    { type: 'quick', mode: currentMode.includes('quick') ? currentMode : 'spotify_quick' }
  ];

  return (
    <View style={styles.iconButtonsContainer}>
      {mainModes.map(({ type, mode }) => (
        <TouchableOpacity
          key={type}
          style={[
            styles.iconButton,
            currentMode.includes(type) && styles.iconButtonActive
          ]}
          onPress={() => {
            if (currentMode === mode) {
              // Toggle provider
              onModeChange(getToggledMode(mode));
            } else {
              // Switch to this type (default to Spotify)
              onModeChange(mode);
            }
          }}
        >
          {getModeIcon(mode)}
        </TouchableOpacity>
      ))}
    </View>
  );
}