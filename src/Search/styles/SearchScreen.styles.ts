// src/Search/styles/SearchScreen.styles.ts
// Styles for the Search Screen
import { StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';

export const searchStyles = StyleSheet.create({
  container: {
    ...theme.styles.container,
  },
  searchContainer: {
    padding: 8,
    backgroundColor: theme.colors.background.amoled,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  searchInput: {
    ...theme.styles.input,
    flex: 1,
  },
  placeholderText: {
    color: theme.colors.text.placeholder,
  },
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
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 8,
  },
  hintText: {
    fontSize: theme.sizes.body,
    color: theme.colors.text.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
  clearSearchButtonText: {
    color: theme.colors.background.surface,
    fontWeight: theme.weights.medium,
    fontSize: theme.sizes.body,
  },

  // Album card
  albumHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.background.amoled,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    padding: 8,
  },
  albumInfo: {
    flex: 1,
    marginRight: 12,
  },
  albumTitle: {
    fontSize: theme.sizes.medium,
    fontWeight: theme.weights.semibold,
    color: theme.colors.text.primary,
    marginBottom: 2,
  },
  albumArtist: {
    fontSize: theme.sizes.small,
    color: theme.colors.text.primary,
  },
  savedCount: {
    color: theme.colors.text.blue,
    fontWeight: theme.weights.medium,
  },
  saveAlbumButton: {
    backgroundColor: theme.colors.button.primary,
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
    color: theme.colors.text.primary,
    fontSize: theme.sizes.small,
    fontWeight: theme.weights.medium,
  },
  importButton: {
    marginTop: 16,
    backgroundColor: theme.colors.button.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  importButtonText: {
    color: theme.colors.text.primary,
    fontWeight: theme.weights.bold,
    fontSize: 16,
  },

  // === Import Modal ===
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: theme.colors.background.amoled,
    borderRadius: theme.borderRadius.lg,
    borderColor: theme.colors.border,
    borderWidth: 1,
    padding: 24,
    width: '95%',
    alignItems: 'stretch',
  },
  modalTitle: {
    fontSize: 20,
    color: theme.colors.text.primary,
    fontWeight: theme.weights.bold,
    marginBottom: 12,
    textAlign: 'center',
  },

  modalInput: {
    color: theme.colors.text.primary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },

  ratingContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    paddingHorizontal: 0,
  },

  modalButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
});