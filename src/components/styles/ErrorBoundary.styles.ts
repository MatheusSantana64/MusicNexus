// src/styles/components/ErrorBoundary.styles.ts
// Styles for the ErrorBoundary component
import { StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';

export const errorBoundaryStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.amoled,
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
    color: theme.colors.text.primary,
    marginBottom: 16,
    textAlign: 'center',
  },
  message: {
    fontSize: theme.sizes.medium,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: theme.colors.button.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: theme.borderRadius.md,
  },
  retryButtonText: {
    color: theme.colors.text.primary,
    fontSize: theme.sizes.medium,
    fontWeight: theme.weights.semibold,
  },
  debugInfo: {
    marginTop: 20,
    padding: 16,
    backgroundColor: theme.colors.background.surface,
    borderRadius: theme.borderRadius.md,
    width: '100%',
  },
  debugTitle: {
    fontSize: theme.sizes.body,
    fontWeight: theme.weights.semibold,
    color: theme.colors.text.error,
    marginBottom: 8,
  },
  debugText: {
    fontSize: theme.sizes.small,
    color: theme.colors.text.secondary,
    fontFamily: 'monospace',
  },
});