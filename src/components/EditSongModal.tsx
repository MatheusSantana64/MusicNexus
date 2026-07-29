import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SavedMusic } from '../types';
import { NeonButton } from './NeonButton';
import { theme } from '../styles/theme';
import { editSongModalStyles as styles } from './styles/EditSongModal.styles';

interface EditSongModalProps {
  visible: boolean;
  music: SavedMusic;
  onSave: (updates: Partial<SavedMusic>) => void;
  onCancel: () => void;
}

const FIELDS: { key: keyof SavedMusic; label: string; numeric?: boolean }[] = [
  { key: 'id', label: 'ID' },
  { key: 'title', label: 'Title' },
  { key: 'album', label: 'Album' },
  { key: 'albumId', label: 'Album ID' },
  { key: 'artist', label: 'Artist' },
  { key: 'artistId', label: 'Artist ID' },
  { key: 'trackPosition', label: 'Track Position', numeric: true },
  { key: 'releaseDate', label: 'Release Date' },
  { key: 'duration', label: 'Duration (s)', numeric: true },
];

function formatDateForInput(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d}T${h}:${min}`;
}

export function EditSongModal({ visible, music, onSave, onCancel }: EditSongModalProps) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const f of FIELDS) {
      const v = music[f.key];
      initial[f.key] = String(v ?? '');
    }
    return initial;
  });

  const [savedAtValue, setSavedAtValue] = useState(() => formatDateForInput(music.savedAt));

  const handleChange = (key: string, value: string) => {
    setValues(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    const updates: Partial<SavedMusic> = {};
    for (const f of FIELDS) {
      const raw = values[f.key];
      if (f.numeric) {
        const num = Number(raw);
        if (!isNaN(num)) {
          (updates as any)[f.key] = num;
        }
      } else {
        (updates as any)[f.key] = raw;
      }
    }
    const parsedDate = new Date(savedAtValue);
    if (!isNaN(parsedDate.getTime())) {
      updates.savedAt = parsedDate;
    }
    onSave(updates);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.title}>Edit Song</Text>

            {FIELDS.map(f => (
              <View key={f.key} style={styles.field}>
                <Text style={styles.label}>{f.label}</Text>
                <TextInput
                  style={styles.input}
                  value={values[f.key]}
                  onChangeText={v => handleChange(f.key, v)}
                  keyboardType={f.numeric ? 'numeric' : 'default'}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            ))}

            <View style={styles.field}>
              <Text style={styles.label}>Saved At</Text>
              <TextInput
                style={styles.input}
                value={savedAtValue}
                onChangeText={setSavedAtValue}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.buttons}>
              <NeonButton text="Cancel" onPress={onCancel} color="#555" icon="close-outline" compact fullWidth={false} style={{ flex: 1 }} />
              <NeonButton text="Save" onPress={handleSave} color="#007AFF" icon="save-outline" compact fullWidth={false} style={{ flex: 1 }} />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}