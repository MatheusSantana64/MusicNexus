import { StyleSheet } from 'react-native';
import { theme } from '../theme';

export const libraryStyles = StyleSheet.create({
  container: {
    ...theme.styles.container,
  },
  searchContainer: {
    padding: 16,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  searchInput: {
    ...theme.styles.input,
  },
  placeholderText: {
    color: theme.colors.placeholder,
  },
  sortContainer: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  sortHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sortLabel: {
    fontSize: theme.sizes.body,
    fontWeight: theme.weights.semibold,
    color: theme.colors.textPrimary,
  },
  resultCount: {
    fontSize: theme.sizes.small,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
  },
  sortButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sortButton: {
    paddingHorizontal: 12 - 2,
    paddingVertical: 6,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    minWidth: 60,
  },
  sortButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  sortButtonText: {
    fontSize: theme.sizes.small,
    fontWeight: theme.weights.medium,
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  sortButtonTextActive: {
    color: theme.colors.surface,
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
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12 - 2,
    borderRadius: theme.borderRadius.md,
  },
  retryButtonText: {
    color: theme.colors.surface,
    fontWeight: theme.weights.semibold,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: theme.weights.bold,
    color: theme.colors.textPrimary,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: theme.sizes.medium,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 16,
  },
  clearSearchButton: {
    backgroundColor: theme.colors.textSecondary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  clearSearchButtonText: {
    color: theme.colors.surface,
    fontWeight: theme.weights.medium,
    fontSize: theme.sizes.body,
  },
});