import { StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';

export const ratingHistoryModalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: theme.colors.background.amoled,
    borderRadius: theme.borderRadius.lg,
    padding: 24,
    width: '85%',
    maxWidth: 340,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  title: {
    fontSize: theme.sizes.title,
    fontWeight: theme.weights.bold,
    color: theme.colors.text.primary,
    marginBottom: 4,
    textAlign: 'center',
  },
  musicTitle: {
    color: theme.colors.text.primary,
    fontSize: theme.sizes.medium,
    fontWeight: theme.weights.semibold,
    textAlign: 'center',
    marginTop: 4,
  },
  artist: {
    color: theme.colors.text.muted,
    fontSize: theme.sizes.small,
    marginBottom: 16,
    textAlign: 'center',
  },
  emptyText: {
    color: theme.colors.text.muted,
    fontStyle: 'italic',
    marginVertical: 24,
    textAlign: 'center',
    fontSize: theme.sizes.small,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background.surface,
    borderRadius: theme.borderRadius.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  ratingBadge: {
    minWidth: 44,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: theme.borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingText: {
    fontWeight: theme.weights.bold,
    fontSize: theme.sizes.small,
  },
  timestamp: {
    color: theme.colors.text.secondary,
    marginLeft: 12,
    fontSize: theme.sizes.small,
    flex: 1,
    textAlign: 'left',
  },
  deleteButton: {
    marginLeft: 8,
    padding: 6,
    borderRadius: theme.borderRadius.sm,
  },
  deleteIcon: {
    color: theme.colors.text.error,
  },
  deleteIconDisabled: {
    color: '#444',
  },
  closeButton: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.blue,
    width: '100%',
    alignItems: 'center',
  },
  closeText: {
    color: theme.colors.blue,
    fontWeight: theme.weights.bold,
    fontSize: theme.sizes.medium,
  },
  list: {
    maxHeight: 260,
    width: '100%',
  },
});
