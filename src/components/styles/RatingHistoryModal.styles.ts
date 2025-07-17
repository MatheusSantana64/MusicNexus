// src/styles/components/RatingHistoryModal.styles.ts
// Styles for the RatingHistoryModal component
import { StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';

export const ratingHistoryModalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: theme.colors.background.amoled,
    borderRadius: theme.borderRadius.lg,
    padding: 20,
    minWidth: '80%',
    alignItems: 'center',
    justifyContent: 'center',
  },

  title: {
    fontSize: theme.sizes.title,
    fontWeight: theme.weights.bold,
    color: theme.colors.text.primary,
    marginBottom: 8,
    textAlign: 'center',
  },

  musicTitle: {
    color: theme.colors.text.primary,
    fontSize: theme.sizes.medium,
    textAlign: 'center',
  },
  artist: {
    color: theme.colors.text.secondary,
    marginBottom: 12,
    textAlign: 'center',
  },

  emptyText: {
    color: theme.colors.text.muted,
    fontStyle: 'italic',
    marginBottom: 16,
    textAlign: 'center',
  },

  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    fontSize: theme.sizes.medium,
  },
  rating: {
    fontWeight: theme.weights.bold,
    fontSize: theme.sizes.medium,
    minWidth: 28,
    textAlign: 'center',
  },
  timestamp: {
    color: theme.colors.text.secondary,
    marginLeft: 12,
    fontSize: theme.sizes.medium,
    minWidth: 128,
    textAlign: 'center',
  },
  deleteButton: {
    marginLeft: 16,
    flexDirection: 'row',
    alignItems: 'center',
    color: theme.colors.text.error,
    fontWeight: theme.weights.bold,
  },
  closeButton: {
    alignSelf: 'flex-end',
    marginTop: 8,
  },
  closeText: {
    color: theme.colors.blue,
    fontWeight: theme.weights.bold,
    fontSize: theme.sizes.medium,
  },
  list: {
    maxHeight: 220,
    marginBottom: 12,
  },
  ratingIcon: {
    marginRight: 6,
    marginTop: 1,
  },
});