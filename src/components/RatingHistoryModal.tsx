// src/components/RatingHistoryModal.tsx
// Modal to display the rating history of a song
import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Modal } from 'react-native';
import { SavedMusic, RatingHistoryEntry } from '../types';
import { getRatingColor, getRatingText } from '../utils/ratingUtils';
import { formatDateTimeDDMMYY_HHMM } from '../utils/dateUtils';
import { ratingHistoryModalStyles as styles } from './styles/RatingHistoryModal.styles';
import { Ionicons } from '@expo/vector-icons';
import { OptionsModal } from './OptionsModal';

interface RatingHistoryModalProps {
  visible: boolean;
  music: SavedMusic;
  onClose: () => void;
  onDeleteEntry?: (music: SavedMusic, entryIdx: number) => void;
}

export function RatingHistoryModal({ visible, music, onClose, onDeleteEntry }: RatingHistoryModalProps) {
  const history: RatingHistoryEntry[] = music.ratingHistory || [];
  const sortedHistory = [...history].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const getOriginalIndex = (sortedIdx: number) => {
    const entry = sortedHistory[sortedIdx];
    return history.findIndex(
      h => h.rating === entry.rating && h.timestamp === entry.timestamp
    );
  };

  const [confirmVisible, setConfirmVisible] = useState(false);
  const [pendingDeleteIdx, setPendingDeleteIdx] = useState<number | null>(null);

  const handleRequestDelete = (idx: number) => {
    setPendingDeleteIdx(idx);
    setConfirmVisible(true);
  };

  const handleConfirmDelete = () => {
    if (pendingDeleteIdx !== null && onDeleteEntry) {
      onDeleteEntry(music, pendingDeleteIdx);
    }
    setConfirmVisible(false);
    setPendingDeleteIdx(null);
  };

  const handleCancelDelete = () => {
    setConfirmVisible(false);
    setPendingDeleteIdx(null);
  };

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={onClose}
      >
        <View style={styles.overlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.title}>Rating History</Text>
            <Text style={styles.musicTitle}>{music.title}</Text>
            <Text style={styles.artist}>{music.artist}</Text>
            {sortedHistory.length === 0 ? (
              <Text style={styles.emptyText}>No rating history.</Text>
            ) : (
              <FlatList
                data={sortedHistory}
                keyExtractor={(_, idx) => idx.toString()}
                renderItem={({ item, index }) => {
                  const originalIdx = getOriginalIndex(index);
                  const color = getRatingColor(item.rating);
                  return (
                    <View style={styles.historyRow}>
                      <View style={[styles.ratingBadge, { backgroundColor: color + '25', borderWidth: 1, borderColor: color }]}>
                        <Text style={[styles.ratingText, { color }]}>{getRatingText(item.rating)}</Text>
                      </View>
                      <Text style={styles.timestamp}>
                        {formatDateTimeDDMMYY_HHMM(item.timestamp)}
                      </Text>
                      {onDeleteEntry && (
                        <TouchableOpacity
                          style={styles.deleteButton}
                          onPress={() => handleRequestDelete(originalIdx)}
                          accessibilityLabel="Delete rating entry"
                        >
                          <Ionicons name="trash-outline" size={16} color="#FF453A" />
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                }}
                style={styles.list}
              />
            )}
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <OptionsModal
        visible={confirmVisible}
        title="Delete Rating Entry"
        message="This action cannot be undone."
        actions={[
          {
            text: 'Delete',
            style: 'destructive',
            onPress: handleConfirmDelete,
            icon: { name: 'trash-outline', color: '#FF3B30' },
          },
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: handleCancelDelete,
            icon: { name: 'close-outline', color: '#8E8E93' },
          },
        ]}
        onBackdropPress={handleCancelDelete}
      />
    </>
  );
}
