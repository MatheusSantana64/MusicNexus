import { StyleSheet } from 'react-native';
import { theme } from '../theme';

export const searchFiltersStyles = StyleSheet.create({
  iconButtonsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  iconButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  iconButtonText: {
    fontSize: 16,
  },
  iconButtonTextActive: {
    // Ícones não mudam de cor, apenas o fundo
  },
});