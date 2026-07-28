// src/utils/ratingUtils.ts
// Utility functions for handling music ratings and colors
import { theme } from '../styles/theme';

export const getRatingColor = (rating: number): string => {
  if (rating === 0) return theme.colors.text.muted; // Grey
  if (rating <= 2.5) return theme.colors.ratings.lowest; // Red
  if (rating <= 4.5) return theme.colors.ratings.low; // Red-orange
  if (rating <= 6.5) return theme.colors.ratings.lowMid; // Orange-yellow
  if (rating <= 7.5) return theme.colors.ratings.medium; // Yellow
  if (rating <= 8.5) return theme.colors.ratings.high; // Green
  if (rating <= 9.5) return theme.colors.ratings.highMid; // Blue
  return theme.colors.ratings.highest; // Violet
};

export const getRatingText = (rating: number): string => {
  if (rating === 0) return 'N/A';
  if (rating === 10) return '10';
  return rating.toFixed(1);
};