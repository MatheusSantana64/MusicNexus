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
});