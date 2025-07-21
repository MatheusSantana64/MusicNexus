// src/Profile/styles/ProfileScreen.styles.ts
// Styles for the Profile Screen
import { StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';

export const profileScreenStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background.amoled,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.amoled,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: 24,
    textAlign: 'center',
    flex: 1,
  },
  section: {
    flex: 1,
    color: theme.colors.text.primary,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text.blue,
    marginBottom: 12,
  },
  sectionBody: {
    fontSize: 16,
    color: theme.colors.text.primary,
    marginBottom: 6,
    textAlign: 'center',
  },
  notesContainer: {
    justifyContent: 'flex-end',
    marginTop: 24,
    marginBottom: 12,
  },
  notesInput: {
    minHeight: 80,
    maxHeight: 160,
    backgroundColor: theme.colors.background.surface,
    color: theme.colors.text.primary,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 8,
  },
  gearIcon: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: theme.colors.background.amoled,
    borderRadius: 16,
    borderColor: theme.colors.border,
    borderWidth: 1,
    padding: 24,
    width: '85%',
    alignItems: 'center',
  },
  configSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text.blue,
    marginBottom: 12,
  },
  closeButton: {
    marginTop: 24,
    backgroundColor: theme.colors.button.cancel,
    paddingVertical: 10,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  closeButtonText: {
    color: theme.colors.text.primary,
    fontWeight: 'bold',
    fontSize: 16,
  },
  columnTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
});