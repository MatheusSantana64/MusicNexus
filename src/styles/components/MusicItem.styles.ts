// src/styles/components/MusicItem.styles.ts
// Styles for the Music Item component
import { StyleSheet } from 'react-native';
import { theme } from '../theme';

const MARGIN_BOTTOM = 3;

export const musicItemStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 6,
    backgroundColor: theme.colors.background.amoled,
    borderBottomWidth: 1,
    alignItems: 'center',
  },

  albumCover: {
    width: 64,
    height: 64,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.background.amoled,
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
    color: theme.colors.text.muted,
  },
  title: {
    fontSize: theme.sizes.body,
    fontWeight: theme.weights.semibold,
    color: theme.colors.text.primary,
    lineHeight: 16,
    flexShrink: 1,
  },
  duration: {
    fontSize: theme.sizes.small,
    color: theme.colors.text.muted,
    lineHeight: 12,
    marginLeft: 4,
    fontWeight: theme.weights.normal,
  },

  artist: {
    fontSize: 11,
    color: theme.colors.text.primary,
    fontWeight: theme.weights.medium,
    marginBottom: MARGIN_BOTTOM,
    lineHeight: 14,
  },
  album: {
    fontSize: 11,
    color: theme.colors.text.secondary,
    fontWeight: theme.weights.normal,
    flex: 1,
    lineHeight: 13,
  },
  releaseDate: {
    fontSize: theme.sizes.small,
    color: theme.colors.text.secondary,
    marginBottom: MARGIN_BOTTOM,
    fontWeight: theme.weights.normal,
    lineHeight: 11,
  },

  savedDate: {
    fontSize: theme.sizes.xsmall,
    color: 'green',
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
    fontSize: theme.sizes.medium,
    fontWeight: 'bold',
    lineHeight: 12,
  },
});