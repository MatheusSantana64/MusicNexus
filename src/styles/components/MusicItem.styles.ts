import { StyleSheet } from 'react-native';
import { theme } from '../theme';

export const musicItemStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    alignItems: 'center',
  },
  albumCover: {
    width: 64,
    height: 64,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.background,
  },
  musicInfo: {
    flex: 1,
    marginLeft: theme.spacing.md,
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  trackNumber: {
    fontSize: theme.typography.sizes.body,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.primary,
  },
  title: {
    fontSize: theme.typography.sizes.medium,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.textPrimary,
    flex: 1,
  },
  artist: {
    fontSize: theme.typography.sizes.body,
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  albumRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  album: {
    fontSize: theme.typography.sizes.small,
    color: theme.colors.textMuted,
    flex: 1,
  },
  year: {
    fontSize: theme.typography.sizes.small,
    color: theme.colors.primary,
    fontWeight: theme.typography.weights.medium,
    marginLeft: theme.spacing.xs,
  },
  releaseDate: {
    fontSize: 11,
    color: theme.colors.success,
    marginBottom: 2,
    fontWeight: theme.typography.weights.medium,
  },
  rightInfo: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    minWidth: 60,
  },
  ratingContainer: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.xs,
    minWidth: 50,
    alignItems: 'center',
  },
  rating: {
    fontSize: theme.typography.sizes.small,
    fontWeight: theme.typography.weights.bold,
  },
  duration: {
    fontSize: theme.typography.sizes.small,
    color: theme.colors.textMuted,
    marginBottom: 2,
  },
  savedDate: {
    fontSize: 11,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
  },
  source: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    fontWeight: theme.typography.weights.medium,
  },
  savedIndicator: {
    fontSize: 14,
    marginLeft: theme.spacing.xs,
  },
});