// src/Profile/ProfileConfigModal.tsx
// ProfileConfigModal for configuring profile settings
import React from 'react';
import { View, Text, Button, Modal, TouchableOpacity, Alert, ActivityIndicator, ScrollView, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import { profileScreenStyles as styles } from './styles/ProfileScreen.styles';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getProfileData, setProfileData, subscribeToProfileChanges } from '../services/profileService';
import { useMusicStore } from '../store/musicStore';
import { migrateSavedMusicToTidal, MigrationProgress, MigrationSummary, MigrationLogEntry } from '../services/migration/tidalMigrationService';

const RATING_STEPS = Array.from({ length: 21 }, (_, i) => (i * 0.5).toFixed(1)).reverse();

interface ProfileConfigModalProps {
  visible: boolean;
  onClose: () => void;
  onDeleteAllSongs: () => void;
  onDeleteAllTags: () => void;
  onOpen: () => void;
}

export function ProfileConfigModal({
  visible,
  onClose,
  onDeleteAllSongs,
  onDeleteAllTags,
  onOpen,
}: ProfileConfigModalProps) {
  const [tooltips, setTooltips] = React.useState<{ [rating: string]: string }>({});
  const [migrationProgress, setMigrationProgress] = React.useState<MigrationProgress | null>(null);
  const [migrationSummary, setMigrationSummary] = React.useState<MigrationSummary | null>(null);
  const [showMigrationLog, setShowMigrationLog] = React.useState(false);
  const [migrationLog, setMigrationLog] = React.useState<MigrationLogEntry[]>([]);
  const [isMigrating, setIsMigrating] = React.useState(false);
  const { savedMusic } = useMusicStore();

  React.useEffect(() => {
    let unsub: (() => void) | undefined;
    if (visible) {
      // Load from local AsyncStorage cache first (for offline support)
      AsyncStorage.getItem('ratingTooltips').then(val => {
        if (val) setTooltips(JSON.parse(val));
      });
      
      // Then try to sync with Firestore and update local cache if needed
      getProfileData().then(data => {
        if (data.ratingTooltips) {
          setTooltips(data.ratingTooltips);
          // Update AsyncStorage cache if it differs
          AsyncStorage.setItem('ratingTooltips', JSON.stringify(data.ratingTooltips));
        }
      }).catch(() => {
        // Ignore errors; local cache is already loaded
      });
      
      // Subscribe to live updates while modal is visible
      unsub = subscribeToProfileChanges((data) => {
        if (data.ratingTooltips) {
          setTooltips(data.ratingTooltips);
          // Update AsyncStorage cache
          AsyncStorage.setItem('ratingTooltips', JSON.stringify(data.ratingTooltips));
        }
      });
    }

    return () => { if (unsub) unsub(); };
  }, [visible]);

  const handleTooltipChange = (rating: string, text: string) => {
    const updated = { ...tooltips, [rating]: text };
    setTooltips(updated);
    AsyncStorage.setItem('ratingTooltips', JSON.stringify(updated));
    setProfileData({ ratingTooltips: updated }); // Save to Firestore
  };

  const handleMigrateToTidal = async () => {
    if (savedMusic.length === 0) {
      Alert.alert('No Songs to Migrate', 'You have no saved songs to migrate.');
      return;
    }

    Alert.alert(
      'Select Target Platform',
      'Choose the platform to which your saved songs should be migrated.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'TIDAL', style: 'default', onPress: confirmTidalMigration },
      ]
    );
  };

  const confirmTidalMigration = () => {
    Alert.alert(
      'Migrate Saved Music to TIDAL',
      `This will search TIDAL for matches to your ${savedMusic.length} saved songs and update their platform metadata (track ID, artist ID, album ID, artwork, etc.) while preserving all your local MusicNexus data (ratings, tags, savedAt, ratingHistory, firebaseId).\n\nSongs that cannot be confidently matched will be logged and left unchanged.\n\nProceed with migration?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Migrate', style: 'default', onPress: () => startMigration() },
      ]
    );
  };

  const startMigration = async () => {
    setIsMigrating(true);
    setMigrationProgress(null);
    setMigrationSummary(null);
    setMigrationLog([]);

    try {
      await migrateSavedMusicToTidal(
        savedMusic,
        (progress) => {
          setMigrationProgress(progress);
        },
        (summary) => {
          setMigrationSummary(summary);
          setMigrationLog(summary.migrationLog);
          setIsMigrating(false);
          if (summary.successful > 0) {
            useMusicStore.getState().loadMusic();
          }
        }
      );
    } catch (error) {
      console.error('Migration error:', error);
      Alert.alert('Migration Failed', 'An error occurred during migration. Please try again.');
      setIsMigrating(false);
    }
  };

  const handleViewMigrationLog = () => {
    setShowMigrationLog(true);
  };

  const handleCloseMigrationLog = () => {
    setShowMigrationLog(false);
  };

  return (
    <>
      <TouchableOpacity onPress={onOpen} style={styles.gearIcon}>
        <Ionicons name="settings-outline" size={28} color={theme.colors.text.primary} />
      </TouchableOpacity>
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={onClose}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.configSectionTitle}>Configurations</Text>
            <View style={{ marginBottom: 12 }}>
              <Button
                title="Delete All Songs"
                color={theme.colors.button.delete}
                onPress={() =>
                  Alert.alert(
                    'Delete All Songs',
                    'Are you sure you want to delete all songs? This cannot be undone.',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Delete', style: 'destructive', onPress: onDeleteAllSongs },
                    ]
                  )
                }
              />
            </View>
            <View>
              <Button
                title="Delete All Tags"
                color={theme.colors.button.delete}
                onPress={() =>
                  Alert.alert(
                    'Delete All Tags',
                    'Are you sure you want to delete all tags? This cannot be undone.',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Delete', style: 'destructive', onPress: onDeleteAllTags },
                    ]
                  )
                }
              />
            </View>
            <Text style={[styles.configSectionTitle, { marginTop: 16 }]}>Rating Tooltips</Text>
            <ScrollView style={{ maxHeight: 220, alignSelf: 'stretch', width: '100%' }}>
              {RATING_STEPS.map(rating => (
                <View
                  key={rating}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginBottom: 8,
                    width: '100%',
                  }}
                >
                  <Text style={{ width: 40, color: theme.colors.text.primary, marginRight: 8 }}>{rating}</Text>
                  <TextInput
                    style={{
                      flex: 1,
                      borderWidth: 1,
                      borderColor: '#333',
                      borderRadius: 6,
                      padding: 4,
                      color: theme.colors.text.primary,
                      backgroundColor: theme.colors.background.surface,
                      fontSize: 15,
                    }}
                    placeholder={`Tooltip for ${rating}`}
                    placeholderTextColor="#888"
                    value={tooltips[rating] || ''}
                    onChangeText={text => handleTooltipChange(rating, text)}
                  />
                </View>
              ))}
            </ScrollView>

            {/* Migration Section */}
            <Text style={[styles.configSectionTitle, { marginTop: 16 }]}>Migration</Text>
            <View style={{ marginBottom: 12 }}>
              <Button
                title={isMigrating ? 'Migrating...' : 'Migrate Songs to Another Platform'}
                color={theme.colors.button.primary}
                onPress={handleMigrateToTidal}
                disabled={isMigrating || savedMusic.length === 0}
              />
              {savedMusic.length === 0 && (
                <Text style={{ color: theme.colors.text.secondary, fontSize: 12, marginTop: 4 }}>
                  No saved music to migrate
                </Text>
              )}
            </View>

            {/* Migration Progress */}
            {migrationProgress && isMigrating && (
              <View style={{ marginBottom: 12, padding: 12, backgroundColor: theme.colors.background.surface, borderRadius: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ color: theme.colors.text.primary, fontWeight: '600' }}>
                    Migrating: {migrationProgress.current}/{migrationProgress.total}
                  </Text>
                  <ActivityIndicator size="small" color={theme.colors.button.primary} />
                </View>
                <Text style={{ color: theme.colors.text.secondary, fontSize: 13 }}>
                  {migrationProgress.currentTrack}
                </Text>
                <View style={{ marginTop: 8 }}>
                  <View
                    style={{
                      height: 6,
                      backgroundColor: theme.colors.background.surface,
                      borderRadius: 3,
                      overflow: 'hidden',
                    }}
                  >
                    <View
                      style={{
                        height: '100%',
                        width: `${(migrationProgress.current / migrationProgress.total) * 100}%`,
                        backgroundColor: theme.colors.button.primary,
                      }}
                    />
                  </View>
                </View>
              </View>
            )}

            {/* Migration Summary */}
            {migrationSummary && !isMigrating && (
              <View style={{ marginBottom: 12, padding: 12, backgroundColor: theme.colors.background.surface, borderRadius: 8 }}>
                <Text style={{ color: theme.colors.text.primary, fontWeight: '600', marginBottom: 8 }}>
                  Migration Complete
                </Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ color: theme.colors.text.secondary }}>Total Processed:</Text>
                  <Text style={{ color: theme.colors.text.primary, fontWeight: '600' }}>{migrationSummary.total}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ color: theme.colors.text.secondary }}>Successful:</Text>
                  <Text style={{ color: theme.colors.text.success, fontWeight: '600' }}>{migrationSummary.successful}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ color: theme.colors.text.secondary }}>Failed:</Text>
                  <Text style={{ color: theme.colors.text.error, fontWeight: '600' }}>{migrationSummary.failed}</Text>
                </View>
                {migrationSummary.failed > 0 && (
                  <Button
                    title="View Migration Log"
                    color={theme.colors.button.primary}
                    onPress={handleViewMigrationLog}
                  />
                )}
              </View>
            )}

            {/* Migration Log Modal */}
            {showMigrationLog && migrationLog.length > 0 && (
              <Modal visible={true} transparent animationType="slide" onRequestClose={handleCloseMigrationLog}>
                <View style={styles.modalOverlay}>
                  <View style={styles.modalContent}>
                    <Text style={styles.configSectionTitle}>Migration Log - Unmatched Songs</Text>
                    <ScrollView style={{ maxHeight: 300, width: '100%' }}>
                      {migrationLog.map((entry, index) => (
                        <View key={index} style={{ marginBottom: 12, padding: 12, backgroundColor: theme.colors.background.surface, borderRadius: 8 }}>
                          <Text style={{ color: theme.colors.text.primary, fontWeight: '600' }}>
                            {entry.originalTrack.title} - {entry.originalTrack.artist}
                          </Text>
                          <Text style={{ color: theme.colors.text.secondary, fontSize: 12, marginTop: 2 }}>
                            Album: {entry.originalTrack.album}
                          </Text>
                          <Text style={{ color: theme.colors.text.secondary, fontSize: 12 }}>
                            Track: {entry.originalTrack.trackPosition} | Disk: {entry.originalTrack.diskNumber} | Duration: {entry.originalTrack.duration}s
                          </Text>
                          <Text style={{ color: theme.colors.button.delete, fontSize: 12, marginTop: 4 }}>
                            Reason: {entry.reason}
                          </Text>
                          <Text style={{ color: theme.colors.text.muted, fontSize: 11, marginTop: 2 }}>
                            {new Date(entry.timestamp).toLocaleString()}
                          </Text>
                        </View>
                      ))}
                    </ScrollView>
                    <TouchableOpacity onPress={handleCloseMigrationLog} style={styles.closeButton}>
                      <Text style={styles.closeButtonText}>Close</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Modal>
            )}

            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}