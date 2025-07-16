// src/styles/components/SearchFilters.styles.ts
// Styles for the Search Filters component
import { StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';

export const searchFiltersStyles = StyleSheet.create({
  iconButtonsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.button.disabled,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  iconButtonActive: {
    backgroundColor: theme.colors.button.primary,
    borderColor: theme.colors.divider,
  },
  iconButtonText: {
    fontSize: 16,
    color: theme.colors.text.secondary,
  },
  iconButtonTextActive: {
    fontSize: 24,
    color: theme.colors.text.primary,
  },
});