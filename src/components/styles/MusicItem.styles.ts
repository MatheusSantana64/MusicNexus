// src/styles/components/MusicItem.styles.ts
// Styles for the Music Item component
import { StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';

export const musicItemStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingVertical: 3,
    paddingHorizontal: 2,
    backgroundColor: theme.colors.background.amoled,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
    alignItems: 'center',
  },

  // === Album Cover ===
  albumCover: {
    width: 64,
    height: 64,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.background.amoled,
  },

  // === Content ===
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

  // === Title Row ===
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trackNumber: {
    fontSize: theme.sizes.xsmall,
    fontWeight: theme.weights.normal,
    color: theme.colors.text.muted,
    marginTop: 3, // Align with title text
  },
  title: {
    fontSize: theme.sizes.body,
    fontWeight: theme.weights.semibold,
    color: theme.colors.text.primary,
    flexShrink: 1, // Allow title to shrink if needed (When overflowing to the rating section)
  },
  duration: {
    fontSize: theme.sizes.xsmall,
    color: theme.colors.text.muted,
    marginLeft: 4,
    fontWeight: theme.weights.normal,
  },

  // === Info ===
  artist: {
    fontSize: theme.sizes.small,
    color: theme.colors.text.primary,
    fontWeight: theme.weights.medium,
  },
  album: {
    fontSize: theme.sizes.small,
    color: theme.colors.text.secondary,
    fontWeight: theme.weights.normal,
  },
  releaseDate: {
    fontSize: theme.sizes.smaller,
    color: theme.colors.text.secondary,
    fontWeight: theme.weights.normal,
  },

  // === Saved Date (Hidden by default) ===
  savedDate: {
    fontSize: theme.sizes.xsmall,
    color: theme.colors.text.successDarker,
    fontStyle: 'italic',
  },

  // === Rating ===
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
    fontSize: theme.sizes.large,
    fontWeight: theme.weights.bold,
  },

  // === Tags ===
  tagContainer: {
    borderRadius: theme.borderRadius.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignContent: 'center',
    justifyContent: 'flex-start',
    marginRight: 3,
    marginTop: 1,
  },
  tagText: {
    color: theme.colors.text.primary,
    fontSize: theme.sizes.smaller,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
});