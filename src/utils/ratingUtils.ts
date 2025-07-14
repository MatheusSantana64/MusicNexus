import { theme } from '../styles/theme';

export const getRatingColor = (rating: number): string => {
  if (rating === 0) return theme.colors.textMuted; // No rating
  if (rating <= 2.5) return theme.colors.ratings.lowest; // Red
  if (rating <= 5) return theme.colors.ratings.low; // Orange
  if (rating <= 7.5) return theme.colors.ratings.medium; // Yellow
  if (rating <= 9.5) return theme.colors.ratings.high; // Green
  return theme.colors.ratings.highest; // Blue
};

export const getRatingText = (rating: number): string => {
  if (rating === 0) return 'N/A';
  if (rating === 10) return '10';
  return rating.toFixed(1);
};