// src/Profile/RatingTipsModal.tsx
// Modal for Notes and Rating Tooltips
import React from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { theme } from '../styles/theme';
import { profileScreenStyles as styles } from './styles/ProfileScreen.styles';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getProfileData, setProfileData, subscribeToProfileChanges } from '../services/profileService';

const RATING_STEPS = Array.from({ length: 21 }, (_, i) => (i * 0.5).toFixed(1)).reverse();

interface RatingTipsModalProps {
  visible: boolean;
  onClose: () => void;
}

export function RatingTipsModal({ visible, onClose }: RatingTipsModalProps) {
  const [tooltips, setTooltips] = React.useState<{ [rating: string]: string }>({});
  const [notes, setNotes] = React.useState('');

  React.useEffect(() => {
    let unsub: (() => void) | undefined;
    if (visible) {
      AsyncStorage.getItem('ratingTooltips').then(val => {
        if (val) setTooltips(JSON.parse(val));
      });
      AsyncStorage.getItem('profileNotes').then(val => {
        if (val !== null) setNotes(val);
      });

      getProfileData().then(data => {
        if (data.ratingTooltips) {
          setTooltips(data.ratingTooltips);
          AsyncStorage.setItem('ratingTooltips', JSON.stringify(data.ratingTooltips));
        }
        if (data.notes !== undefined) {
          setNotes(data.notes);
          AsyncStorage.setItem('profileNotes', data.notes);
        }
      }).catch(() => {});

      unsub = subscribeToProfileChanges((data) => {
        if (data.ratingTooltips) {
          setTooltips(data.ratingTooltips);
          AsyncStorage.setItem('ratingTooltips', JSON.stringify(data.ratingTooltips));
        }
        if (data.notes !== undefined) {
          setNotes(data.notes);
          AsyncStorage.setItem('profileNotes', data.notes);
        }
      });
    }

    return () => { if (unsub) unsub(); };
  }, [visible]);

  const handleTooltipChange = (rating: string, text: string) => {
    const updated = { ...tooltips, [rating]: text };
    setTooltips(updated);
    AsyncStorage.setItem('ratingTooltips', JSON.stringify(updated));
    setProfileData({ ratingTooltips: updated });
  };

  const handleNotesChange = (text: string) => {
    setNotes(text);
    AsyncStorage.setItem('profileNotes', text);
    setProfileData({ notes: text });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.configSectionTitle}>Notes</Text>
            <TextInput
              style={{
                minHeight: 80,
                maxHeight: 160,
                backgroundColor: theme.colors.background.surface,
                color: theme.colors.text.primary,
                borderRadius: 8,
                padding: 12,
                fontSize: 16,
                borderWidth: 1,
                borderColor: theme.colors.border,
                width: '100%',
                marginBottom: 16,
              }}
              placeholder="Write your notes here..."
              placeholderTextColor={theme.colors.text.secondary}
              multiline
              value={notes}
              onChangeText={handleNotesChange}
            />
            <Text style={styles.configSectionTitle}>Rating Tooltips</Text>
            {RATING_STEPS.map(rating => (
              <View
                key={rating}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginBottom: 4,
                  width: '100%',
                }}
              >
                <Text style={{ width: 32, color: theme.colors.text.primary, marginRight: 4 }}>{rating}</Text>
                <TextInput
                  style={{
                    flex: 1,
                    borderWidth: 1,
                    borderColor: '#333',
                    borderRadius: 6,
                    padding: 8,
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
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
