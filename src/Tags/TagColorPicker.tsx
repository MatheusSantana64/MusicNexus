// src/Tags/TagColorPicker.tsx
// TagColorPicker component for selecting colors for music tags
import React from 'react';
import { Modal, View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import ColorPicker, { Panel3, Preview, BrightnessSlider } from 'reanimated-color-picker';
import { theme } from '../styles/theme';

interface TagColorPickerProps {
  visible: boolean;
  value: string;
  onChange: (hex: string) => void;
  onClose: () => void;
}

export function TagColorPicker({ visible, value, onChange, onClose }: TagColorPickerProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <ColorPicker
            style={{ width: '100%' }}
            value={value}
            onChangeJS={color => onChange(color.hex)}
          >
            <Preview />
            <Panel3 style={{ height: 300, marginVertical: 16 }} />
            <BrightnessSlider reverse={true} />
          </ColorPicker>
          <TouchableOpacity
            onPress={onClose}
            style={{
              marginTop: 16,
              backgroundColor: value,
              padding: 12,
              borderRadius: 8,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: theme.colors.text.primary, fontWeight: 'bold' }}>Save Selected Color</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onClose}
            style={{
              marginTop: 8,
              backgroundColor: theme.colors.button.cancel,
              padding: 12,
              borderRadius: 8,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: theme.colors.text.primary, fontWeight: 'bold' }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    backgroundColor: 'transparent',
    borderRadius: 12,
    padding: 20,
    alignItems: 'stretch',
  },
});