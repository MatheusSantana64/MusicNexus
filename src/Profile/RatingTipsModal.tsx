// src/Profile/RatingTipsModal.tsx
import React from 'react';
import { View, Text, Modal, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { theme } from '../styles/theme';
import { Ionicons } from '@expo/vector-icons';
import { profileScreenStyles as styles } from './styles/ProfileScreen.styles';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getProfileData, setProfileData, subscribeToProfileChanges } from '../services/profileService';
import { NeonButton } from '../components/NeonButton';

const RATING_STEPS = Array.from({ length: 21 }, (_, i) => (i * 0.5).toFixed(1)).reverse();

interface RatingTipsModalProps {
  visible: boolean;
  onClose: () => void;
}

export function RatingTipsModal({ visible, onClose }: RatingTipsModalProps) {
  const [tooltips, setTooltips] = React.useState<{ [rating: string]: string }>({});
  const [minimumRatingForTidalSave, setMinimumRatingForTidalSave] = React.useState<number>(0);

  React.useEffect(() => {
    let unsub: (() => void) | undefined;
    if (visible) {
      AsyncStorage.getItem('ratingTooltips').then(val => {
        if (val) setTooltips(JSON.parse(val));
      });
      getProfileData().then(data => {
        if (data.ratingTooltips) {
          setTooltips(data.ratingTooltips);
          AsyncStorage.setItem('ratingTooltips', JSON.stringify(data.ratingTooltips));
        }
        if (data.minimumRatingForTidalSave !== undefined) {
          setMinimumRatingForTidalSave(data.minimumRatingForTidalSave);
        }
      }).catch(() => {});

      unsub = subscribeToProfileChanges((data) => {
        if (data.ratingTooltips) {
          setTooltips(data.ratingTooltips);
          AsyncStorage.setItem('ratingTooltips', JSON.stringify(data.ratingTooltips));
        }
        if (data.minimumRatingForTidalSave !== undefined) {
          setMinimumRatingForTidalSave(data.minimumRatingForTidalSave);
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

  const handleMinRatingChange = (value: number) => {
    setMinimumRatingForTidalSave(value);
    setProfileData({ minimumRatingForTidalSave: value });
  };

  const decreaseMinRating = () => {
    const next = Math.max(0, minimumRatingForTidalSave - 0.5);
    handleMinRatingChange(next);
  };

  const increaseMinRating = () => {
    const next = Math.min(10, minimumRatingForTidalSave + 0.5);
    handleMinRatingChange(next);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 16 }}>
        <View style={{ flex: 1, backgroundColor: theme.colors.background.amoled, borderRadius: theme.borderRadius.lg, borderColor: theme.colors.border, borderWidth: 1, maxHeight: '95%', overflow: 'hidden' }}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ padding: 12, paddingBottom: 20 }}
            style={{ flex: 1 }}
          >
            <Text style={styles.configSectionTitle}>Auto-Save to TIDAL Library</Text>
            <Text style={{ color: theme.colors.text.secondary, fontSize: 12, marginBottom: 12 }}>
              Songs rated at or above this threshold are automatically saved to your TIDAL library. Songs that drop below are removed.
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 16, height: 28 }}>
              <TouchableOpacity onPress={decreaseMinRating} style={{ width: 28, height: 28, justifyContent: 'center', alignItems: 'center' }}>
                <Ionicons name="chevron-back" size={20} color={theme.colors.text.secondary} />
              </TouchableOpacity>
              <Text style={{ color: theme.colors.text.primary, fontSize: 22, fontWeight: '700', marginHorizontal: 16, minWidth: 44, textAlign: 'center' }}>
                {minimumRatingForTidalSave === 0 ? 'Off' : minimumRatingForTidalSave.toFixed(1)}
              </Text>
              <TouchableOpacity onPress={increaseMinRating} style={{ width: 28, height: 28, justifyContent: 'center', alignItems: 'center' }}>
                <Ionicons name="chevron-forward" size={20} color={theme.colors.text.secondary} />
              </TouchableOpacity>
            </View>

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
          </ScrollView>
          <NeonButton text="Close" onPress={onClose} color="#555" fullWidth style={{ paddingVertical: 14, borderTopWidth: 1, borderTopColor: theme.colors.divider, borderRadius: 0 }} />
        </View>
      </View>
    </Modal>
  );
}