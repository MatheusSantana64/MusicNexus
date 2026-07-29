import React from 'react';
import { TouchableOpacity, Text, View, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface NeonButtonProps {
  text: string;
  onPress: () => void;
  color?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
  fullWidth?: boolean;
  compact?: boolean;
  loading?: boolean;
  style?: any;
}

export function NeonButton({ text, onPress, color = '#007AFF', icon, disabled, fullWidth = true, compact, loading, style }: NeonButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.button,
        fullWidth && styles.fullWidth,
        compact && styles.compact,
        { borderColor: color, backgroundColor: color + '25' },
        (disabled || loading) && { opacity: 0.5 },
        style,
      ]}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#FFFFFF" />
      ) : (
        <View style={styles.inner}>
          {icon && (
            <Ionicons name={icon} size={20} color={color} style={{ marginRight: 4 }} />
          )}
          <Text style={[styles.text, (disabled || loading) && { opacity: 0.5 }]}>{text}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  compact: {
    paddingVertical: 8,
  },
  fullWidth: {
    width: '100%',
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    marginTop: -1,
  },
});