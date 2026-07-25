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
  headerBar: {
    height: 56,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text.blue,
    marginBottom: 12,
  },

  // Hero stat cards row
  heroRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  heroCard: {
    flex: 1,
    backgroundColor: theme.colors.background.surface,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  heroNumber: {
    fontSize: 26,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: 2,
  },
  heroLabel: {
    fontSize: 12,
    color: theme.colors.text.muted,
    fontWeight: '500',
  },

  // Rating distribution
  ratingSection: {
    marginBottom: 20,
  },
  ratingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  ratingSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
  },
  avgBadge: {
    backgroundColor: theme.colors.background.surface,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  avgBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: theme.colors.gold,
  },
  ratingBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  ratingBarLabel: {
    width: 56,
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text.secondary,
    textAlign: 'right',
    marginRight: 8,
  },
  ratingBarTrack: {
    flex: 1,
    height: 14,
    backgroundColor: theme.colors.background.surface,
    borderRadius: 7,
    overflow: 'hidden',
  },
  ratingBarFill: {
    height: 14,
    borderRadius: 7,
  },
  ratingBarCount: {
    width: 28,
    fontSize: 11,
    color: theme.colors.text.muted,
    textAlign: 'right',
    marginLeft: 6,
  },

  ratingTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // Modal styles
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
  },
  modalContent: {
    backgroundColor: theme.colors.background.amoled,
    borderRadius: 16,
    borderColor: theme.colors.border,
    borderWidth: 1,
    padding: 12,
    width: '100%',
    maxHeight: '88%',
  },
  configSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text.blue,
    marginBottom: 12,
  },
  closeButton: {
    marginTop: 8,
    backgroundColor: theme.colors.button.cancel,
    paddingVertical: 10,
    paddingHorizontal: 32,
    borderRadius: 8,
    alignSelf: 'center',
  },
  closeButtonText: {
    color: theme.colors.text.primary,
    fontWeight: 'bold',
    fontSize: 16,
    textAlign: 'center',
  },
});
