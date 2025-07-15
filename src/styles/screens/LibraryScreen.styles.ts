// src/styles/screens/LibraryScreen.styles.ts
// Styles for the Library Screen
import { StyleSheet } from 'react-native';
import { theme } from '../theme';

export const libraryStyles = StyleSheet.create({
  container: {
    ...theme.styles.container,
  },

  // Search section
  searchContainer: {
    paddingTop: 8,
    paddingHorizontal: 8,
    backgroundColor: theme.colors.background.amoled,
  },
  searchInput: {
    ...theme.styles.input,
  },
  placeholderText: {
    color: theme.colors.text.placeholder,
  },

  // Sort and filter section
  sortContainer: {
    backgroundColor: theme.colors.background.amoled,
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  sortLabelButton: {
    paddingHorizontal: 6,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.button.disabled,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  sortHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sortLabel: {
    fontSize: theme.sizes.body,
    fontWeight: theme.weights.normal,
    color: theme.colors.text.primary,
  },
  resultCount: {
    fontSize: theme.sizes.small,
    color: theme.colors.text.secondary,
    fontStyle: 'italic',
    marginRight: 8,
  },
  sortButtons: {
    marginTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sortButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: theme.colors.button.disabled,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    minWidth: 30,
  },
  sortButtonActive: {
    backgroundColor: theme.colors.button.primary,
    borderColor: theme.colors.border,
  },
  sortButtonText: {
    fontSize: theme.sizes.small,
    fontWeight: theme.weights.medium,
    color: theme.colors.text.primary,
    textAlign: 'center',
  },
  sortButtonTextActive: {
    color: theme.colors.text.primary,
  },

  // Library content
  centerContainer: {
    ...theme.styles.centerContainer,
  },
  loadingText: {
    marginTop: 16,
    fontSize: theme.sizes.medium,
    color: theme.colors.text.secondary,
  },
  errorText: {
    fontSize: theme.sizes.medium,
    color: theme.colors.text.error,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: theme.colors.button.success,
    paddingHorizontal: 24,
    paddingVertical: 12 - 2,
    borderRadius: theme.borderRadius.md,
  },
  retryButtonText: {
    color: theme.colors.text.primary,
    fontWeight: theme.weights.semibold,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: theme.weights.bold,
    color: theme.colors.text.primary,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: theme.sizes.medium,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 16,
  },
  clearSearchButton: {
    backgroundColor: theme.colors.button.white,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  clearSearchButtonText: {
    color: theme.colors.text.black,
    fontWeight: theme.weights.medium,
    fontSize: theme.sizes.body,
  },
});