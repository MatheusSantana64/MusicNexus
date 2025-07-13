import { StyleSheet } from 'react-native';
import { theme } from '../theme';

const MARGIN_BOTTOM = 3;

export const musicItemStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 6,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    alignItems: 'center',
  },

  albumCover: {
    width: 64,
    height: 64,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.background,
  },

  contentContainer: {
    flex: 1,
    flexDirection: 'row',
    marginLeft: 8,
    alignItems: 'center',
  },
  musicInfo: {
    flex: 0.8,
    justifyContent: 'center',
    paddingRight: 8,
  },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: MARGIN_BOTTOM,
  },
  trackNumber: {
    fontSize: 10,
    fontWeight: theme.weights.normal,
    color: theme.colors.textMuted,
  },
  title: {
    fontSize: theme.sizes.body,
    fontWeight: theme.weights.semibold,
    color: theme.colors.textPrimary,
    lineHeight: 16,
    flexShrink: 1,
  },
  duration: {
    fontSize: theme.sizes.small,
    color: theme.colors.textMuted,
    lineHeight: 12,
    marginLeft: 4,
    fontWeight: theme.weights.normal,
  },

  artist: {
    fontSize: 11,
    color: theme.colors.textPrimary,
    fontWeight: theme.weights.medium,
    marginBottom: MARGIN_BOTTOM,
    lineHeight: 14,
  },
  album: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontWeight: theme.weights.normal,
    flex: 1,
    lineHeight: 13,
  },
  releaseDate: {
    fontSize: theme.sizes.small,
    color: theme.colors.textPrimary,
    marginBottom: MARGIN_BOTTOM,
    fontWeight: theme.weights.normal,
    lineHeight: 11,
  },

  savedDate: {
    fontSize: theme.sizes.xsmall,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
    lineHeight: 11,
  },

  ratingSection: {
    flex: 0.2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingContainer: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
    minWidth: 35,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rating: {
    fontSize: theme.sizes.small,
    fontWeight: 'bold',
    lineHeight: 12,
  },
});