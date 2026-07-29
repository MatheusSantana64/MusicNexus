// src/components/OptionsModal.tsx
// OptionsModal component for displaying options in a modal
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import Modal from 'react-native-modal';
import { optionsModalStyles as styles } from './styles/OptionsModal.styles';

import { Ionicons } from '@expo/vector-icons';
import { NeonButton } from './NeonButton';

export interface ModalAction {
  text: string;
  onPress: () => void;
  style?: 'default' | 'cancel' | 'destructive';
  color?: string;
  icon?: {
    name: keyof typeof Ionicons.glyphMap;
    color?: string;
    size?: number;
  };
}

interface OptionsModalProps {
  visible: boolean;
  title: string;
  message?: string;
  actions: ModalAction[];
  onBackdropPress?: () => void;
}

export function OptionsModal({
  visible,
  title,
  message,
  actions,
  onBackdropPress,
}: OptionsModalProps) {
  const handleBackdropPress = () => {
    if (onBackdropPress) {
      onBackdropPress();
    } else {
      const cancelAction = actions.find(action => action.style === 'cancel');
      if (cancelAction) {
        cancelAction.onPress();
      }
    }
  };

  return (
    <Modal
      isVisible={visible}
      onBackdropPress={handleBackdropPress}
      backdropColor="rgba(0, 0, 0, 0.7)"
      backdropOpacity={1}
      animationIn="fadeIn"
      animationOut="fadeOut"
      useNativeDriver
      hideModalContentWhileAnimating
      style={styles.modal}
    >
      <View style={styles.modalContainer}>
        <Text style={styles.title}>{title}</Text>
        
        {message && (
          <Text style={styles.message}>{message}</Text>
        )}
        
        <View style={styles.actionsContainer}>
          {actions.map((action, index) => {
            let btnColor = '#007AFF';
            if (action.style === 'destructive') btnColor = '#FF453A';
            else if (action.style === 'cancel') btnColor = '#555';
            else if (action.color) btnColor = action.color;

            return (
              <NeonButton
                key={index}
                text={action.text}
                onPress={action.onPress}
                color={btnColor}
                icon={action.icon?.name}
                fullWidth
              />
            );
          })}
        </View>
      </View>
    </Modal>
  );
}

const { width } = Dimensions.get('window');