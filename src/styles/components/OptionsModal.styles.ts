// src/styles/components/OptionsModal.styles.ts
// Styles for the OptionsModal component
import { StyleSheet, Dimensions } from 'react-native';
import { theme } from '../theme';

const { width } = Dimensions.get('window');

export const optionsModalStyles = StyleSheet.create({
  modal: {
    justifyContent: 'center',
    alignItems: 'center',
    margin: 20,
  },
  modalContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: 24,
    width: Math.min(width - 40, 320),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  title: {
    fontSize: theme.sizes.title,
    fontWeight: theme.weights.bold,
    color: theme.colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: theme.sizes.medium,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  actionsContainer: {
    width: '100%',
    gap: 12,
  },
  actionButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  defaultButton: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  destructiveButton: {
    backgroundColor: theme.colors.error + '20',
    borderColor: theme.colors.error,
  },
  cancelButton: {
    backgroundColor: theme.colors.background,
    borderColor: theme.colors.border,
  },
  actionButtonText: {
    fontSize: theme.sizes.medium,
    fontWeight: theme.weights.medium,
  },
  defaultButtonText: {
    color: theme.colors.surface,
  },
  destructiveButtonText: {
    color: theme.colors.error,
  },
  cancelButtonText: {
    color: theme.colors.textSecondary,
  },
});