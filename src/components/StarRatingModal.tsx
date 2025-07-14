import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import StarRating from 'react-native-star-rating-widget';
import { theme } from '../styles/theme';

interface StarRatingModalProps {
  visible: boolean;
  title: string;
  itemName: string;
  initialRating?: number;
  onSave: (rating: number) => void;
  onCancel: () => void;
}

export function StarRatingModal({
  visible,
  title,
  itemName,
  initialRating = 0,
  onSave,
  onCancel,
}: StarRatingModalProps) {
  const [rating, setRating] = useState(initialRating);

  // Update rating when initialRating changes or modal becomes visible
  React.useEffect(() => {
    if (visible) {
      setRating(initialRating);
    }
  }, [visible, initialRating]);

  const handleSave = () => {
    onSave(rating);
    setRating(0); // Reset for next use
  };

  const handleCancel = () => {
    setRating(initialRating); // Reset to initial value
    onCancel();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.itemName} numberOfLines={2}>
            {itemName}
          </Text>
          
          <View style={styles.ratingContainer}>
            <Text style={styles.ratingText}>
            <>
                <Text style={styles.ratingValue}>{rating.toFixed(1)}/10</Text>
            </>
            </Text>
            <StarRating
              rating={rating}
              onChange={setRating}
              maxStars={10}
              starSize={32}
              color={theme.colors.gold}
              emptyColor="#333333"
              enableHalfStar={true}
              starStyle={styles.star}
            />
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: 24,
    width: Math.min(width - 40, 350),
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
  itemName: {
    fontSize: theme.sizes.medium,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  ratingContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  star: {
    marginHorizontal: 0,
  },
  ratingText: {
    marginBottom: 12,
    fontWeight: theme.weights.medium,
  },
  ratingValue: {
    fontSize: theme.sizes.title,
    color: theme.colors.gold,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: theme.colors.textSecondary,
    fontSize: theme.sizes.medium,
    fontWeight: theme.weights.medium,
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  saveButtonText: {
    color: theme.colors.surface,
    fontSize: theme.sizes.medium,
    fontWeight: theme.weights.semibold,
  },
});