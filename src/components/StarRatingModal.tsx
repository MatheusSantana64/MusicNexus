// src/components/StarRatingModal.tsx
// StarRatingModal component for displaying a star rating modal
import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
} from 'react-native';
import StarRating from 'react-native-star-rating-widget';
import { getRatingColor, getRatingText } from '../utils/ratingUtils';
import { starRatingModalStyles as styles } from '../styles/components/StarRatingModal.styles';

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
              <Text style={[styles.ratingValue, { color: getRatingColor(rating) }]}>
                {rating === 0 ? getRatingText(rating) : `${getRatingText(rating)}/10`}
              </Text>
            </Text>
            <StarRating
              rating={rating}
              onChange={setRating}
              maxStars={10}
              starSize={32}
              color={getRatingColor(rating)}
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