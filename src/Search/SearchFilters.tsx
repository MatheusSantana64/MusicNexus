// src/Search/SearchFilters.tsx
// Component for search mode filters in the SearchScreen
import React from 'react';
import {
  View,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SearchMode } from '../types';
import { searchFiltersStyles as styles } from './styles/SearchFilters.styles';

interface SearchFiltersProps {
  currentMode: SearchMode;
  onModeChange: (mode: SearchMode) => void;
}

export function SearchFilters({ currentMode, onModeChange }: SearchFiltersProps) {
  // Helper to get the other provider for the same type
  const getToggledMode = (mode: SearchMode): SearchMode => {
    const providerModes: Record<'album' | 'quick', SearchMode[]> = {
      album: ['tidal_album', 'spotify_album', 'deezer_album'],
      quick: ['tidal_quick', 'spotify_quick', 'deezer_quick'],
    };
    const type = mode.includes('album') ? 'album' : 'quick';
    const modes = providerModes[type];
    return modes[(modes.indexOf(mode) + 1) % modes.length];
  };

  const getModeIcon = (mode: SearchMode): React.ReactNode => {
    switch (mode) {
      case 'tidal_album':
        return <MaterialCommunityIcons name="album" size={currentMode === mode ? 24 : 16} color="#00ffff" />;
      case 'tidal_quick':
        return <MaterialCommunityIcons name="flash" size={currentMode === mode ? 24 : 16} color="#00ffff" />;
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
    { type: 'album', mode: currentMode.includes('album') ? currentMode : 'tidal_album' },
    { type: 'quick', mode: currentMode.includes('quick') ? currentMode : 'tidal_quick' }
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
              // Switch to this type (default to TIDAL)
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