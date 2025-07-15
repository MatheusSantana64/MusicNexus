// src/styles/theme.ts
import { StyleSheet } from 'react-native';

export const theme = {
  // 🎨 COLORS - AMOLED DARK MODE
  colors: {
    // TEXT COLORS (for dark mode)
    text: {
      primary: '#FFFFFF', // White text
      secondary: '#CCCCCC', // Light gray for secondary text
      muted: '#888888', // Muted gray for less important text
      placeholder: '#CCCCCC', // Placeholder text color
      black: '#000000', // Black text
      blue: '#007AFF', // Blue for links and interactive text
      success: '#32D74B', // Brighter green for dark mode
      error: '#FF453A', // Brighter red for dark mode
      warning: '#FF9F0A', // Brighter orange for dark mode
    },
    // BACKGROUND COLORS
    background: {
      amoled: '#000000', // Pure black for AMOLED
      surface: '#111111', // Very dark gray for cards/surfaces
    },
    // RATINGS COLORS 
    ratings: {
      lowest: '#d83a32ff', // Red for lowest rating (0.5-2.5 stars)
      low: '#ec9317ff', // Orange for low rating (3-5 stars)
      medium: '#e1c038ff', // Yellow for medium rating (5.5-7.5 stars)
      high: '#32ba49ff', // Green for high rating (8-9.5 stars)
      highest: '#32aed0ff', // Blue for highest rating (10 stars)
    },
    // BUTTON COLORS
    button: {
      primary: '#004b9aff', // Blue for primary buttons
      success: '#00570dff', // Green for success actions
      delete: '#5a0f0bff', // Red for delete actions
      cancel: '#444444', // Dark gray for cancel actions
      disabled: '#1c1c1cff', // Dark gray for disabled buttons
      white: '#FFFFFF', // White for buttons
    },
    // OTHER COLORS
    blue: '#007AFF', // Blue for buttons
    border: '#333333', // Dark gray borders
    divider: '#222222', // Subtle dividers
    gold: '#FFD700', // Gold color for stars
  },
  
  // 🔤 TYPOGRAPHY
  sizes: {
    xsmall: 10,
    small: 12,
    body: 14,
    medium: 16,
    large: 18,
    title: 20,
  },
  weights: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  
  // 🔘 BORDERS
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    round: 22,
  },

  // 🧩 COMMON STYLES - AMOLED DARK
  styles: StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#000000', // Pure black background
    },
    
    centerContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 32,
    },
    
    surface: {
      backgroundColor: '#111111', // Dark surface
      borderBottomWidth: 1,
      borderBottomColor: '#333333', // Dark border
    },
    
    input: {
      height: 44,
      backgroundColor: '#222222', // Dark input background
      borderRadius: 22,
      paddingHorizontal: 16,
      fontSize: 16,
      borderWidth: 1,
      borderColor: '#444444', // Dark border
      color: '#FFFFFF', // White text
    },

    // Text styles
    title: {
      fontSize: 20,
      fontWeight: '600',
      color: '#FFFFFF', // White text
    },
    
    body: {
      fontSize: 14,
      fontWeight: '400',
      color: '#FFFFFF', // White text
    },
    
    caption: {
      fontSize: 12,
      color: '#CCCCCC', // Light gray
    },
    
    hint: {
      fontSize: 14,
      color: '#888888', // Muted gray
      fontStyle: 'italic',
    },
  }),
} as const;

export type Theme = typeof theme;