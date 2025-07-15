// src/styles/components/ErrorBoundary.styles.ts
// Styles for the ErrorBoundary component
import { StyleSheet } from 'react-native';
import { theme } from '../theme';

export const errorBoundaryStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    alignItems: 'center',
    maxWidth: 300,
  },
  title: {
    fontSize: theme.sizes.title,
    fontWeight: theme.weights.bold,
    color: theme.colors.textPrimary,
    marginBottom: 16,
    textAlign: 'center',
  },
  message: {
    fontSize: theme.sizes.medium,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: theme.borderRadius.md,
  },
  retryButtonText: {
    color: theme.colors.surface,
    fontSize: theme.sizes.medium,
    fontWeight: theme.weights.semibold,
  },
  debugInfo: {
    marginTop: 20,
    padding: 16,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    width: '100%',
  },
  debugTitle: {
    fontSize: theme.sizes.body,
    fontWeight: theme.weights.semibold,
    color: theme.colors.error,
    marginBottom: 8,
  },
  debugText: {
    fontSize: theme.sizes.small,
    color: theme.colors.textSecondary,
    fontFamily: 'monospace',
  },
});