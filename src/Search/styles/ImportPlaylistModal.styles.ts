// src/Search/ImportPlaylistModal.tsx
// Styles for the ImportPlaylistModal component
import { StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';

export const importPlaylistModalStyles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: theme.colors.background.amoled,
    borderRadius: theme.borderRadius.lg,
    borderColor: theme.colors.border,
    borderWidth: 1,
    padding: 24,
    width: '95%',
    alignItems: 'stretch',
  },
  modalTitle: {
    fontSize: 20,
    color: theme.colors.text.primary,
    fontWeight: theme.weights.bold,
    marginBottom: 12,
    textAlign: 'center',
  },
  modalInput: {
    color: theme.colors.text.primary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 10,
    paddingRight: 36,
    marginBottom: 12,
  },
  ratingContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    paddingHorizontal: 0,
  },
  ratingLabel: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    marginBottom: 2,
    fontStyle: 'italic',
  },
  ratingValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  errorText: {
    fontSize: theme.sizes.medium,
    color: theme.colors.text.error,
    textAlign: 'center',
    lineHeight: 24,
  },
  modalButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
});