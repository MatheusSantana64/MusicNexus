// src/components/RatingHistoryModal.tsx
// Modal to display the rating history of a song
import React from 'react';
import { View, Text, FlatList, TouchableOpacity, Modal } from 'react-native';
import { SavedMusic, RatingHistoryEntry } from '../types';
import { getRatingColor, getRatingText } from '../utils/ratingUtils';
import { formatDateTimeDDMMYY_HHMM } from '../utils/dateUtils';

interface RatingHistoryModalProps {
  visible: boolean;
  music: SavedMusic;
  onClose: () => void;
}

export function RatingHistoryModal({ visible, music, onClose }: RatingHistoryModalProps) {
  const history: RatingHistoryEntry[] = music.ratingHistory || [];
  const sortedHistory = [...history].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' }}>
        <View style={{ backgroundColor: '#181818', borderRadius: 12, padding: 20, minWidth: 300, maxWidth: 350 }}>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 8 }}>
            Rating History
          </Text>
          <Text style={{ color: '#aaa', marginBottom: 12 }}>{music.title} - {music.artist}</Text>
          {sortedHistory.length === 0 ? (
            <Text style={{ color: '#ccc', fontStyle: 'italic', marginBottom: 16 }}>No rating history.</Text>
          ) : (
            <FlatList
              data={sortedHistory}
              keyExtractor={(_, idx) => idx.toString()}
              renderItem={({ item }) => (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={{ color: getRatingColor(item.rating), fontWeight: 'bold', width: 48 }}>
                    {getRatingText(item.rating)}
                  </Text>
                  <Text style={{ color: '#bbb', marginLeft: 12 }}>
                    {formatDateTimeDDMMYY_HHMM(item.timestamp)}
                  </Text>
                </View>
              )}
              style={{ maxHeight: 220, marginBottom: 12 }}
            />
          )}
          <TouchableOpacity onPress={onClose} style={{ alignSelf: 'flex-end', marginTop: 8 }}>
            <Text style={{ color: '#4da6ff', fontWeight: 'bold', fontSize: 16 }}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
