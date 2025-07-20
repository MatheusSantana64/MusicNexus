// src/Profile/ProfileConfigModal.tsx
// ProfileConfigModal for configuring profile settings
import React from 'react';
import { View, Text, Button, Modal, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import { profileScreenStyles as styles } from './styles/ProfileScreen.styles';

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
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}