// src/Profile/ProfileConfigModal.tsx
// ProfileConfigModal for configuring profile settings
import React from 'react';
import { View, Text, Button, Modal, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import { profileScreenStyles as styles } from './styles/ProfileScreen.styles';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ScrollView, TextInput } from 'react-native';
import { getProfileData, setProfileData, subscribeToProfileChanges } from '../services/profileService';

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

  React.useEffect(() => {
    let unsub: (() => void) | undefined;
    // Load from Firestore first, fallback to AsyncStorage
    if (visible) {
      getProfileData().then(data => {
        if (data.ratingTooltips) setTooltips(data.ratingTooltips);
        else AsyncStorage.getItem('ratingTooltips').then(val => { if (val !== null) setTooltips(JSON.parse(val)); });
      });
      // Subscribe to live updates while modal is visible
      unsub = subscribeToProfileChanges((data) => {
        if (data.ratingTooltips) {
          setTooltips(data.ratingTooltips);
        } else {
          AsyncStorage.getItem('ratingTooltips').then(val => { if (val !== null) setTooltips(JSON.parse(val)); });
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
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}