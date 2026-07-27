import { StyleSheet, Dimensions } from 'react-native';
import { theme } from '../../styles/theme';

const { height } = Dimensions.get('window');

export const editSongModalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
  },
  container: {
    backgroundColor: theme.colors.background.amoled,
    borderRadius: 16,
    borderColor: theme.colors.border,
    borderWidth: 1,
    padding: 12,
    width: '100%',
    maxHeight: '88%',
  },
  title: {
    fontSize: theme.sizes.title,
    fontWeight: theme.weights.bold,
    color: theme.colors.text.primary,
    textAlign: 'center',
    paddingBottom: 12,
  },
  scrollContent: {
    paddingHorizontal: 8,
  },
  field: {
    marginBottom: 12,
  },
  label: {
    fontSize: theme.sizes.small,
    fontWeight: theme.weights.medium,
    color: theme.colors.text.secondary,
    marginBottom: 4,
  },
  input: {
    height: 40,
    backgroundColor: '#111111',
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 12,
    color: theme.colors.text.primary,
    fontSize: theme.sizes.body,
  },
  buttons: {
    flexDirection: 'row',
    paddingTop: 8,
    paddingBottom: 4,
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.button.cancel,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: theme.colors.text.primary,
    fontSize: theme.sizes.body,
    fontWeight: theme.weights.medium,
  },
  saveBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.button.primary,
    borderWidth: 1,
    borderColor: theme.colors.blue,
    alignItems: 'center',
  },
  saveBtnText: {
    color: theme.colors.text.primary,
    fontSize: theme.sizes.body,
    fontWeight: theme.weights.medium,
  },
});