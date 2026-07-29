import { StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';

export const tagsScreenStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.amoled,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
  },

  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 40,
    color: theme.colors.text.primary,
    backgroundColor: theme.colors.background.surface,
  },
  inputSection: {
    flex: 1,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 12,
    paddingBottom: 8,
    paddingHorizontal: 16,
  },
  preview: {
    height: 40,
    borderRadius: 14,
  },
  panel: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  slider: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  tagColor: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 12,
  },
  tagName: {
    flex: 1,
    color: theme.colors.text.primary,
    fontSize: 16,
    borderRadius: 16,
    padding: 2,
    textAlign: 'center',
  },
  actionButton: {
    marginHorizontal: 4,
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginRight: 0,
  },
  dragHandle: {
    marginRight: 8,
    padding: 4,
  },
  bottomBar: {
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  bottomActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
