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
    backgroundColor: theme.colors.background.amoled,
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
    color: theme.colors.text.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: theme.sizes.medium,
    color: theme.colors.text.secondary,
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
    backgroundColor: theme.colors.button.primary,
    borderColor: theme.colors.blue,
  },
  destructiveButton: {
    backgroundColor: theme.colors.button.delete,
    borderColor: theme.colors.text.error,
  },
  cancelButton: {
    backgroundColor: theme.colors.button.cancel,
    borderColor: theme.colors.border,
  },
  actionButtonText: {
    fontSize: theme.sizes.medium,
    fontWeight: theme.weights.medium,
  },
  defaultButtonText: {
    color: theme.colors.text.primary,
  },
  destructiveButtonText: {
    color: theme.colors.text.primary,
  },
  cancelButtonText: {
    color: theme.colors.text.primary,
  },
});