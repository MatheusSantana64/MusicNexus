// src/styles/screens/SearchScreen.styles.ts
// Styles for the Search Screen
import { StyleSheet } from 'react-native';
import { theme } from '../theme';

export const searchStyles = StyleSheet.create({
  container: {
    ...theme.styles.container,
  },
  searchContainer: {
    padding: 16,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  searchInput: {
    ...theme.styles.input,
    flex: 1,
  },
  placeholderText: {
    color: theme.colors.placeholder,
  },
  centerContainer: {
    ...theme.styles.centerContainer,
  },
  loadingText: {
    marginTop: 16,
    fontSize: theme.sizes.medium,
    color: theme.colors.textSecondary,
  },
  errorText: {
    fontSize: theme.sizes.medium,
    color: theme.colors.error,
    textAlign: 'center',
    lineHeight: 24,
  },
  emptyText: {
    fontSize: theme.sizes.medium,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 8,
  },
  hintText: {
    fontSize: theme.sizes.body,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  clearSearchButtonText: {
    color: theme.colors.surface,
    fontWeight: theme.weights.medium,
    fontSize: theme.sizes.body,
  },
  albumHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.background,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  albumInfo: {
    flex: 1,
    marginRight: 12,
  },
  albumTitle: {
    fontSize: theme.sizes.medium,
    fontWeight: theme.weights.semibold,
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  albumArtist: {
    fontSize: theme.sizes.small,
    color: theme.colors.textSecondary,
  },
  savedCount: {
    color: theme.colors.primary,
    fontWeight: theme.weights.medium,
  },
  saveAlbumButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.md,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveAlbumButtonLoading: {
    opacity: 0.6,
  },
  saveAlbumButtonText: {
    color: theme.colors.surface,
    fontSize: theme.sizes.small,
    fontWeight: theme.weights.medium,
  },
});