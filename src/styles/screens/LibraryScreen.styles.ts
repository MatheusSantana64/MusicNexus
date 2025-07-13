import { StyleSheet } from 'react-native';
import { theme } from '../theme';

export const libraryStyles = StyleSheet.create({
  container: {
    ...theme.styles.container,
  },
  searchContainer: {
    padding: theme.spacing.lg,
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
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  sortHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  sortLabel: {
    fontSize: theme.typography.sizes.body,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.textPrimary,
  },
  resultCount: {
    fontSize: theme.typography.sizes.small,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
  },
  sortButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  sortButton: {
    paddingHorizontal: theme.spacing.md - 2,
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
    fontSize: theme.typography.sizes.small,
    fontWeight: theme.typography.weights.medium,
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
    marginTop: theme.spacing.lg,
    fontSize: theme.typography.sizes.medium,
    color: theme.colors.textSecondary,
  },
  errorText: {
    fontSize: theme.typography.sizes.medium,
    color: theme.colors.error,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: theme.spacing.lg,
  },
  retryButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md - 2,
    borderRadius: theme.borderRadius.md,
  },
  retryButtonText: {
    color: theme.colors.surface,
    fontWeight: theme.typography.weights.semibold,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  emptyText: {
    fontSize: theme.typography.sizes.medium,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: theme.spacing.lg,
  },
  clearSearchButton: {
    backgroundColor: theme.colors.textSecondary,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: 6,
  },
  clearSearchButtonText: {
    color: theme.colors.surface,
    fontWeight: theme.typography.weights.medium,
    fontSize: theme.typography.sizes.body,
  },
});