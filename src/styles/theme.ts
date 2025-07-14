// src/styles/theme.ts
import { StyleSheet } from 'react-native';

export const theme = {
  // 🎨 COLORS - AMOLED DARK MODE
  colors: {
    primary: '#007AFF',
    background: '#000000', // Pure black for AMOLED
    surface: '#111111', // Very dark gray for cards/surfaces
    border: '#333333', // Dark gray borders
    divider: '#222222', // Subtle dividers
    textPrimary: '#FFFFFF', // White text
    textSecondary: '#CCCCCC', // Light gray for secondary text
    textMuted: '#888888', // Muted gray for less important text
    placeholder: '#CCCCCC', // Placeholder text color
    success: '#32D74B', // Brighter green for dark mode
    error: '#FF453A', // Brighter red for dark mode
    warning: '#FF9F0A', // Brighter orange for dark mode
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