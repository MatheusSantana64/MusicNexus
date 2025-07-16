// src/components/SearchBar.tsx
// This file defines the SearchBar component used in the music search feature of the application.
import React from 'react';
import { View, TextInput, ActivityIndicator, TouchableOpacity, Text } from 'react-native';
import { SearchMode } from '../types';
import { SearchFilters } from './SearchFilters';
import { searchStyles as styles } from './styles/SearchScreen.styles';

interface SearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  loading: boolean;
  searchMode: SearchMode;
  onModeChange: (mode: SearchMode) => void;
}

export function SearchBar({ 
  searchQuery, 
  onSearchChange, 
  loading, 
  searchMode, 
  onModeChange 
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
            style={{ paddingRight: 12, paddingBottom: 2 }}
            accessibilityLabel="Clear search"
          >
            <Text style={{ fontSize: 18, color: '#888' }}>✕</Text>
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