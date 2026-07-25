// src/Search/SearchBar.tsx
// SearchBar component for the music search feature
import React from 'react';
import { View, TextInput, TouchableOpacity } from 'react-native';
import { SearchMode } from '../types';
import { SearchFilters } from './SearchFilters';
import { searchStyles as styles } from './styles/SearchScreen.styles';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../styles/theme';

interface SearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  loading: boolean;
  searchMode: SearchMode;
  onModeChange: (mode: SearchMode) => void;
  searchInputRef?: React.RefObject<TextInput | null>;
}

export function SearchBar({ 
  searchQuery, 
  onSearchChange, 
  loading, 
  searchMode, 
  onModeChange,
  searchInputRef
}: SearchBarProps) {
  return (
    <View style={[styles.searchContainer, { flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: styles.searchInput.backgroundColor,
        borderRadius: 8,
        flex: 1,
      }}>
        <TextInput
          ref={searchInputRef}
          style={[styles.searchInput, { flex: 1, borderWidth: 0, backgroundColor: 'transparent' }]}
          placeholder="Search music..."
          placeholderTextColor={styles.placeholderText.color}
          value={searchQuery}
          onChangeText={onSearchChange}
          autoCorrect={false}
          clearButtonMode="never"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => onSearchChange('')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={{ paddingRight: 10 }}
            accessibilityLabel="Clear search"
          >
            <Ionicons name="close-circle" size={18} color={theme.colors.text.secondary} />
          </TouchableOpacity>
        )}
      </View>
      <SearchFilters 
        currentMode={searchMode}
        onModeChange={onModeChange}
      />
    </View>
  );
}