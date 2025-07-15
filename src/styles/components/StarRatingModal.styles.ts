// src/styles/components/StarRatingModal.styles.ts
// Styles for the StarRatingModal component
import { StyleSheet, Dimensions } from 'react-native';
import { theme } from '../theme';

const { width } = Dimensions.get('window');

export const starRatingModalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: theme.colors.background.amoled + '75', // Semi-transparent overlay
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: theme.colors.background.amoled,
    borderRadius: theme.borderRadius.lg,
    padding: 24,
    width: Math.min(width - 40, 350),
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
  itemName: {
    fontSize: theme.sizes.medium,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  ratingContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  star: {
    marginHorizontal: 0,
  },
  ratingText: {
    marginBottom: 12,
    fontWeight: theme.weights.medium,
  },
  ratingValue: {
    fontSize: theme.sizes.title,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: theme.colors.button.cancel,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: theme.colors.text.primary,
    fontSize: theme.sizes.medium,
    fontWeight: theme.weights.medium,
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: theme.colors.button.primary,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.blue,
    alignItems: 'center',
  },
  saveButtonText: {
    color: theme.colors.text.primary,
    fontSize: theme.sizes.medium,
    fontWeight: theme.weights.semibold,
  },
});