import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import Modal from 'react-native-modal';
import { theme } from '../styles/theme';

export interface ModalAction {
  text: string;
  onPress: () => void;
  style?: 'default' | 'cancel' | 'destructive';
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
              <Text style={getButtonTextStyle(action.style)}>
                {action.text}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </Modal>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  modal: {
    justifyContent: 'center',
    alignItems: 'center',
    margin: 20,
  },
  modalContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: 24,
    width: Math.min(width - 40, 320),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  title: {
    fontSize: theme.sizes.title,
    fontWeight: theme.weights.bold,
    color: theme.colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: theme.sizes.medium,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  actionsContainer: {
    width: '100%',
    gap: 12,
  },
  actionButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  defaultButton: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  destructiveButton: {
    backgroundColor: theme.colors.error + '20',
    borderColor: theme.colors.error,
  },
  cancelButton: {
    backgroundColor: theme.colors.background,
    borderColor: theme.colors.border,
  },
  actionButtonText: {
    fontSize: theme.sizes.medium,
    fontWeight: theme.weights.medium,
  },
  defaultButtonText: {
    color: theme.colors.surface,
  },
  destructiveButtonText: {
    color: theme.colors.error,
  },
  cancelButtonText: {
    color: theme.colors.textSecondary,
  },
});