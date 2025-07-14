// src/components/SearchBar.tsx
// This file defines the SearchBar component used in the music search feature of the application.
import React from 'react';
import { View, TextInput, ActivityIndicator } from 'react-native';
import { SearchMode } from '../types/music';
import { SearchFilters } from './SearchFilters';
import { searchStyles as styles } from '../styles/screens/SearchScreen.styles';

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
    <View style={styles.searchContainer}>
      <TextInput
        style={styles.searchInput}
        placeholder="Search music..."
        placeholderTextColor={styles.placeholderText.color}
        value={searchQuery}
        onChangeText={onSearchChange}
        autoCorrect={false}
        clearButtonMode="while-editing"
      />
      {loading && (
        <ActivityIndicator 
          size="small" 
          color="#007AFF"
        />
      )}
      <SearchFilters 
        currentMode={searchMode}
        onModeChange={onModeChange}
      />
    </View>
  );
}