import { StyleSheet } from 'react-native';
import { theme } from '../theme';

export const searchStyles = StyleSheet.create({
  container: {
    ...theme.styles.container,
  },
  searchContainer: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    ...theme.styles.input,
    flex: 1,
  },
  placeholderText: {
    color: theme.colors.placeholder,
  },
  searchLoading: {
    marginLeft: theme.spacing.md,
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
  },
  emptyText: {
    fontSize: theme.typography.sizes.medium,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: theme.spacing.sm,
  },
  hintText: {
    fontSize: theme.typography.sizes.body,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    fontStyle: 'italic',
  },
});