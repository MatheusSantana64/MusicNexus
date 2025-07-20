// src/History/HistoryScreen.styles.ts
// Styles for the History Screen
import { StyleSheet } from 'react-native';
import { theme } from '../styles/theme';

const MARGIN_BOTTOM = 3;

export const historyScreenStyles = StyleSheet.create({
  // ====== Container Styles ======
  container: {
    flexDirection: 'row',
    padding: 6,
    backgroundColor: theme.colors.background.amoled,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
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

  // ====== Music Info Section ======
  musicInfo: {
    flex: 0.7,
    alignItems: 'flex-start',
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
  artist: {
    fontSize: theme.sizes.small,
    color: theme.colors.text.primary,
    fontWeight: theme.weights.medium,
    marginBottom: MARGIN_BOTTOM,
    lineHeight: 14,
  },
  album: {
    fontSize: theme.sizes.small,
    color: theme.colors.text.secondary,
    fontWeight: theme.weights.normal,
    flex: 1,
    lineHeight: 13,
  },
  releaseDate: {
    fontSize: theme.sizes.xsmall,
    color: theme.colors.text.secondary,
    fontWeight: theme.weights.normal,
    lineHeight: 11,
    marginTop: 2,
  },

  // ====== Rating Section ======
  ratingSection: {
    flex: 0.3,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  ratingContainer: {
    marginTop: 14,
    borderRadius: theme.borderRadius.sm,
    minWidth: 35,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rating: {
    fontSize: theme.sizes.medium,
    fontWeight: 'bold',
    lineHeight: 14,
    color: theme.colors.text.primary,
  },
  ratingDate: {
    fontSize: theme.sizes.xsmall,
    color: theme.colors.text.successDarker,
    fontStyle: 'italic',
    marginTop: 8,
    textAlign: 'left',
    marginLeft: -40, // Negative margin to extend leftward
  },
});