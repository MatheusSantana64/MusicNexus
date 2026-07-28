import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../styles/theme';

interface TagTidalConfigModalProps {
  visible: boolean;
  tagName: string;
  currentPlaylistId: string;
  onSave: (playlistId: string) => void;
  onRemove: () => void;
  onCancel: () => void;
}

function parseTidalPlaylistId(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return '';
  const urlMatch = trimmed.match(/playlist\/([\w-]+)/);
  if (urlMatch) return urlMatch[1];
  if (/^[\w-]+$/.test(trimmed)) return trimmed;
  return '';
}

export function TagTidalConfigModal({
  visible,
  tagName,
  currentPlaylistId,
  onSave,
  onRemove,
  onCancel,
}: TagTidalConfigModalProps) {
  const [inputValue, setInputValue] = useState(currentPlaylistId);
  const [error, setError] = useState('');

  const handleSave = () => {
    const parsed = parseTidalPlaylistId(inputValue);
    if (!parsed) {
      setError('Invalid playlist link or ID');
      return;
    }
    onSave(parsed);
  };

  const handleRemove = () => {
    setInputValue('');
    setError('');
    onRemove();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>TIDAL Playlist</Text>
          <Text style={styles.subtitle}>{tagName}</Text>

          <TextInput
            style={[styles.input, error ? styles.inputError : null]}
            value={inputValue}
            onChangeText={(v) => { setInputValue(v); setError(''); }}
            placeholder="Playlist link or ID"
            placeholderTextColor={theme.colors.text.placeholder}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {currentPlaylistId ? (
            <Text style={styles.currentId}>Current: {currentPlaylistId}</Text>
          ) : null}

          <View style={styles.buttons}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            {currentPlaylistId ? (
              <TouchableOpacity style={styles.removeBtn} onPress={handleRemove}>
                <Ionicons name="trash" size={16} color={theme.colors.text.error} />
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveBtnText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = {
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center' as const,
  },
  container: {
    backgroundColor: theme.colors.background.amoled,
    borderRadius: 16,
    borderColor: theme.colors.border,
    borderWidth: 1,
    padding: 16,
    marginHorizontal: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    color: theme.colors.text.primary,
    textAlign: 'center' as const,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    textAlign: 'center' as const,
    marginBottom: 16,
  },
  input: {
    height: 44,
    backgroundColor: '#111111',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 12,
    color: theme.colors.text.primary,
    fontSize: 14,
    marginBottom: 4,
  },
  inputError: {
    borderColor: theme.colors.text.error,
  },
  errorText: {
    color: theme.colors.text.error,
    fontSize: 12,
    marginBottom: 8,
  },
  currentId: {
    color: theme.colors.text.muted,
    fontSize: 12,
    marginBottom: 12,
    textAlign: 'center' as const,
  },
  buttons: {
    flexDirection: 'row' as const,
    paddingTop: 8,
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: theme.colors.button.cancel,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center' as const,
  },
  cancelBtnText: {
    color: theme.colors.text.primary,
    fontSize: 14,
    fontWeight: '500' as const,
  },
  removeBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: theme.colors.button.delete,
    borderWidth: 1,
    borderColor: theme.colors.text.error,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  saveBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: theme.colors.button.primary,
    borderWidth: 1,
    borderColor: theme.colors.blue,
    alignItems: 'center' as const,
  },
  saveBtnText: {
    color: theme.colors.text.primary,
    fontSize: 14,
    fontWeight: '500' as const,
  },
};
