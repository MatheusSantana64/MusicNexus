// src/Profile/ProfileConfigModal.tsx
// ProfileConfigModal for configuring profile settings
import React from 'react';
import { View, Text, Button, Modal, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import { profileScreenStyles as styles } from './styles/ProfileScreen.styles';
import { useMusicStore } from '../store/musicStore';
import { backupAllCollections, exportLocalBackup, importLocalBackup } from '../services/backupService';
import { showToast } from '../utils/toast';

interface ProfileConfigModalProps {
  visible: boolean;
  onClose: () => void;
  onDeleteAllSongs: () => void;
  onDeleteAllTags: () => void;
  onOpen: () => void;
  onOpenAccount: () => void;
  onOpenTips: () => void;
}

export function ProfileConfigModal({
  visible,
  onClose,
  onDeleteAllSongs,
  onDeleteAllTags,
  onOpen,
  onOpenAccount,
  onOpenTips,
}: ProfileConfigModalProps) {
  const [isBackingUp, setIsBackingUp] = React.useState(false);
  const [backupProgress, setBackupProgress] = React.useState<{ phase: string; current: number; total: number } | null>(null);
  const [isExporting, setIsExporting] = React.useState(false);
  const [exportProgress, setExportProgress] = React.useState<{ phase: string; current: number; total: number } | null>(null);
  const [isImporting, setIsImporting] = React.useState(false);
  const [importProgress, setImportProgress] = React.useState<{ phase: string; current: number; total: number } | null>(null);

  const handleBackup = () => {
    Alert.alert(
      'Backup Firestore Data',
      'This will create a cloud backup of all your data with a timestamped collection name.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Backup', style: 'default', onPress: startBackup },
      ]
    );
  };

  const startBackup = async () => {
    setIsBackingUp(true);
    setBackupProgress(null);
    try {
      const result = await backupAllCollections((progress) => {
        setBackupProgress(progress);
      });
      setIsBackingUp(false);
      setBackupProgress(null);
      showToast(
        `Backup complete: ${result.savedMusic} songs, ${result.tags} tags, ${result.userProfile} profiles`,
        'success',
      );
    } catch (error) {
      console.error('Backup error:', error);
      setIsBackingUp(false);
      setBackupProgress(null);
      showToast('Backup failed. Check console for details.', 'error');
    }
  };

  const handleExportLocal = () => {
    Alert.alert(
      'Export Local Backup',
      'This will save all your data to a JSON file you can share or store.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Export', style: 'default', onPress: startExport },
      ]
    );
  };

  const startExport = async () => {
    setIsExporting(true);
    setExportProgress(null);
    try {
      await exportLocalBackup((progress) => {
        setExportProgress(progress);
      });
      setIsExporting(false);
      setExportProgress(null);
      showToast('Backup file ready', 'success');
    } catch (error) {
      console.error('Export error:', error);
      setIsExporting(false);
      setExportProgress(null);
      showToast('Export failed. Check console for details.', 'error');
    }
  };

  const handleImportLocal = () => {
    Alert.alert(
      'Restore from Backup',
      'This will overwrite your current data with the contents of the backup file.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore',
          style: 'destructive',
          onPress: () =>
            Alert.alert(
              'Are you absolutely sure?',
              'Your current data will be replaced. Any unsaved changes will be lost.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Restore', style: 'destructive', onPress: startImport },
              ]
            ),
        },
      ]
    );
  };

  const startImport = async () => {
    setIsImporting(true);
    setImportProgress(null);
    try {
      const result = await importLocalBackup((progress) => {
        setImportProgress(progress);
      });
      setIsImporting(false);
      setImportProgress(null);
      useMusicStore.getState().loadMusic();
      showToast(
        `Restore complete: ${result.savedMusic} songs, ${result.tags} tags, ${result.userProfile} profiles`,
        'success',
      );
    } catch (error) {
      console.error('Import error:', error);
      setIsImporting(false);
      setImportProgress(null);
      if (error instanceof Error && error.message === 'cancelled') return;
      showToast('Restore failed. Check console for details.', 'error');
    }
  };

  const busy = isBackingUp || isExporting || isImporting;

  return (
    <>
      <TouchableOpacity onPress={onOpenAccount} style={[styles.gearIcon, { right: 88 }]}>
          <Ionicons name="person-circle-outline" size={28} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={onOpenTips} style={[styles.gearIcon, { right: 52 }]}>
          <Ionicons name="document-text-outline" size={28} color={theme.colors.text.primary} />
        </TouchableOpacity>
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
            <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.configSectionTitle}>Backup</Text>
            <View style={{ marginBottom: 12 }}>
              <Button
                title={isBackingUp ? 'Backing up...' : 'Backup to Cloud'}
                color={theme.colors.button.primary}
                onPress={handleBackup}
                disabled={busy}
              />
              {backupProgress && (
                <View style={{ marginTop: 8 }}>
                  <Text style={{ color: theme.colors.text.secondary, fontSize: 12 }}>
                    {backupProgress.phase}: {backupProgress.current}/{backupProgress.total}
                  </Text>
                  <View style={{ marginTop: 4, height: 4, backgroundColor: theme.colors.background.surface, borderRadius: 2, overflow: 'hidden' }}>
                    <View style={{ height: '100%', width: `${(backupProgress.current / backupProgress.total) * 100}%`, backgroundColor: theme.colors.button.primary }} />
                  </View>
                </View>
              )}
            </View>
            <View style={{ marginBottom: 12 }}>
              <Button
                title={isExporting ? 'Exporting...' : 'Export to File'}
                color={theme.colors.button.primary}
                onPress={handleExportLocal}
                disabled={busy}
              />
              {exportProgress && (
                <View style={{ marginTop: 8 }}>
                  <Text style={{ color: theme.colors.text.secondary, fontSize: 12 }}>
                    {exportProgress.phase}: {exportProgress.current}/{exportProgress.total}
                  </Text>
                  <View style={{ marginTop: 4, height: 4, backgroundColor: theme.colors.background.surface, borderRadius: 2, overflow: 'hidden' }}>
                    <View style={{ height: '100%', width: `${(exportProgress.current / exportProgress.total) * 100}%`, backgroundColor: theme.colors.button.primary }} />
                  </View>
                </View>
              )}
            </View>
            <View style={{ marginBottom: 12 }}>
              <Button
                title={isImporting ? 'Restoring...' : 'Restore from File'}
                color={theme.colors.button.delete}
                onPress={handleImportLocal}
                disabled={busy}
              />
              {importProgress && (
                <View style={{ marginTop: 8 }}>
                  <Text style={{ color: theme.colors.text.secondary, fontSize: 12 }}>
                    {importProgress.phase}: {importProgress.current}/{importProgress.total}
                  </Text>
                  <View style={{ marginTop: 4, height: 4, backgroundColor: theme.colors.background.surface, borderRadius: 2, overflow: 'hidden' }}>
                    <View style={{ height: '100%', width: `${(importProgress.current / importProgress.total) * 100}%`, backgroundColor: theme.colors.button.delete }} />
                  </View>
                </View>
              )}
            </View>
            <Text style={[styles.configSectionTitle, { marginTop: 16 }]}>Data</Text>
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
                      {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: () =>
                          Alert.alert(
                            'Are you absolutely sure?',
                            'This will permanently remove every song from your library.',
                            [
                              { text: 'Cancel', style: 'cancel' },
                              { text: 'Delete', style: 'destructive', onPress: onDeleteAllSongs },
                            ]
                          ),
                      },
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
                      {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: () =>
                          Alert.alert(
                            'Are you absolutely sure?',
                            'This will permanently remove every tag from your library.',
                            [
                              { text: 'Cancel', style: 'cancel' },
                              { text: 'Delete', style: 'destructive', onPress: onDeleteAllTags },
                            ]
                          ),
                      },
                    ]
                  )
                }
              />
            </View>

            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}
