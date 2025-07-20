// src/styles/components/StarRatingModal.styles.ts
// Styles for the StarRatingModal component
import { StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';

export const starRatingModalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: theme.colors.background.amoled + '75', // Semi-transparent overlay
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
    padding: 12,
  },
  modalContainer: {
    backgroundColor: theme.colors.background.amoled,
    borderRadius: theme.borderRadius.lg,
    padding: 12,
    height: 'auto',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },

  // Header
  title: {
    fontSize: 24,
    fontWeight: theme.weights.bold,
    color: theme.colors.text.primary,
    marginBottom: 8,
  },

  // Star Rating
  ratingContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  star: {
    marginHorizontal: 0,
  },
  ratingValue: {
    fontSize: 24,
  },

  // Buttons
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 6,
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
    flex: 1.5,
    paddingVertical: 6,
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

  // Tags
  tagButton: {
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 6,
    marginVertical: 4,
    minWidth: '90%',
    alignItems: 'center',
  },
  tagButtonText: {
    color: theme.colors.text.primary,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  tagScrollContainer: {
    width: '100%',
    maxHeight: '70%',
    alignItems: 'center',
    marginBottom: 16,
  },
  tagScrollContent: {
    alignItems: 'center',
    paddingBottom: 8,
  },
});