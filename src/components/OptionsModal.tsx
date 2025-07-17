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

export interface ModalAction {
  text: string;
  onPress: () => void;
  style?: 'default' | 'cancel' | 'destructive';
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
      // Find cancel action as fallback
      const cancelAction = actions.find(action => action.style === 'cancel');
      if (cancelAction) {
        cancelAction.onPress();
      }
    }
  };

  const getButtonStyle = (style?: string) => {
    switch (style) {
      case 'destructive':
        return [styles.actionButton, styles.destructiveButton];
      case 'cancel':
        return [styles.actionButton, styles.cancelButton];
      default:
        return [styles.actionButton, styles.defaultButton];
    }
  };

  const getButtonTextStyle = (style?: string) => {
    switch (style) {
      case 'destructive':
        return [styles.actionButtonText, styles.destructiveButtonText];
      case 'cancel':
        return [styles.actionButtonText, styles.cancelButtonText];
      default:
        return [styles.actionButtonText, styles.defaultButtonText];
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
          {actions.map((action, index) => (
            <TouchableOpacity
              key={index}
              style={getButtonStyle(action.style)}
              onPress={action.onPress}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                {action.icon && (
                  <Ionicons
                    name={action.icon.name}
                    size={action.icon.size || 20}
                    color={action.icon.color || '#333'}
                    style={{ marginRight: 8 }}
                  />
                )}
                <Text style={getButtonTextStyle(action.style)}>
                  {action.text}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </Modal>
  );
}

const { width } = Dimensions.get('window');