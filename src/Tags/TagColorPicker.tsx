import React, { useState, useCallback } from 'react';
import { Modal, View, useWindowDimensions, LayoutChangeEvent, StyleSheet } from 'react-native';
import ColorPicker, { Panel3, Preview, BrightnessSlider } from 'reanimated-color-picker';
import { theme } from '../styles/theme';
import { NeonButton } from '../components/NeonButton';

interface TagColorPickerProps {
  visible: boolean;
  value: string;
  onChange: (hex: string) => void;
  onClose: () => void;
}

export function TagColorPicker({ visible, value, onChange, onClose }: TagColorPickerProps) {
  const win = useWindowDimensions();
  const [layoutTick, setLayoutTick] = useState(0);

  console.log('[TagColorPicker] render', { visible, winW: win.width, winH: win.height, layoutTick });

  const handleShow = useCallback(() => {
    console.log('[TagColorPicker] onShow');
    setLayoutTick(t => t + 1);
  }, []);

  const handleOverlayLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height, x, y } = e.nativeEvent.layout;
    console.log('[TagColorPicker] overlay layout:', { width, height, x, y });
  }, []);

  const handleContentLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height, x, y } = e.nativeEvent.layout;
    console.log('[TagColorPicker] content layout:', { width, height, x, y });
  }, []);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      onShow={handleShow}
    >
      <View style={styles.overlay} onLayout={handleOverlayLayout} key={layoutTick}>
        <View style={styles.content} onLayout={handleContentLayout}>
          <ColorPicker
            style={{ width: '100%' }}
            value={value}
            onChangeJS={color => onChange(color.hex)}
          >
            <Preview />
            <Panel3 style={{ height: 300, marginVertical: 16 }} />
            <BrightnessSlider reverse={true} />
          </ColorPicker>
          <NeonButton text="Save Selected Color" onPress={onClose} color={value} icon="checkmark-outline" compact />
          <NeonButton text="Cancel" onPress={onClose} color="#555" icon="close-outline" compact style={{ marginTop: 8 }} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: '90%',
    backgroundColor: theme.colors.background.amoled,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 20,
    alignItems: 'stretch',
  },
});
