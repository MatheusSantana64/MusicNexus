// src/components/StarRatingModal.tsx
// StarRatingModal component for displaying a star rating modal
import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import StarRating from 'react-native-star-rating-widget';
import { getRatingColor, getRatingText } from '../utils/ratingUtils';
import { starRatingModalStyles as styles } from './styles/StarRatingModal.styles';
import { useTagStore } from '../store/tagStore';
import { Tag } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface StarRatingModalProps {
  visible: boolean;
  title: string;
  itemName: string;
  initialRating?: number;
  initialSelectedTagIds?: string[];
  tags: Tag[];
  onSave: (rating: number, selectedTagIds: string[]) => void;
  onCancel: () => void;
}

export function StarRatingModal({
  visible,
  title,
  itemName,
  initialRating = 0,
  initialSelectedTagIds = [],
  tags,
  onSave,
  onCancel,
}: StarRatingModalProps) {
  const [rating, setRating] = useState(initialRating);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(initialSelectedTagIds);
  const [tooltips, setTooltips] = useState<{ [rating: string]: string }>({});

  // Update rating and selected tags when initialRating or initialSelectedTagIds changes or modal becomes visible
  React.useEffect(() => {
    if (visible) {
      setRating(initialRating);
      setSelectedTagIds(initialSelectedTagIds);
      AsyncStorage.getItem('ratingTooltips').then(val => {
        if (val) setTooltips(JSON.parse(val));
        else setTooltips({});
      });
    }
  }, [visible, initialRating, initialSelectedTagIds]);

  const handleTagToggle = (tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const handleSave = () => {
    onSave(rating, selectedTagIds);
    setRating(0); // Reset for next use
    setSelectedTagIds([]); // Clear selected tags
  };

  const handleCancel = () => {
    setRating(initialRating); // Reset to initial value
    setSelectedTagIds(initialSelectedTagIds); // Reset selected tags
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
          <Text style={styles.title}>{title} - {itemName}</Text>

          {/* Tag selection */}
          <View style={styles.tagScrollContainer}>
            <ScrollView
              style={{ width: '100%' }}
              contentContainerStyle={styles.tagScrollContent}
              showsVerticalScrollIndicator={true}
            >
              {(() => {
                const selectedTags = [...tags]
                  .filter(tag => selectedTagIds.includes(tag.id))
                  .sort((a, b) => a.position - b.position);
                const unselectedTags = [...tags]
                  .filter(tag => !selectedTagIds.includes(tag.id))
                  .sort((a, b) => a.position - b.position);

                return (
                  <>
                    {selectedTags.map((tag) => (
                      <TouchableOpacity
                        key={tag.id}
                        onPress={() => handleTagToggle(tag.id)}
                        style={[
                          styles.tagButton,
                          {
                            backgroundColor: selectedTagIds.includes(tag.id) ? tag.color : '#222',
                            borderColor: tag.color,
                          },
                        ]}
                      >
                        <Text style={styles.tagButtonText}>
                          {tag.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                    {selectedTags.length > 0 && unselectedTags.length > 0 && (
                      <View style={{ height: 8 }} /> // Small margin separator between selected and unselected tags
                    )}
                    {unselectedTags.map((tag) => (
                      <TouchableOpacity
                        key={tag.id}
                        onPress={() => handleTagToggle(tag.id)}
                        style={[
                          styles.tagButton,
                          {
                            backgroundColor: selectedTagIds.includes(tag.id) ? tag.color : '#222',
                            borderColor: tag.color,
                          },
                        ]}
                      >
                        <Text style={styles.tagButtonText}>
                          {tag.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </>
                );
              })()}
            </ScrollView>
          </View>
          
          <View style={styles.ratingContainer}>
            {/* Tooltip */}
            {tooltips[rating.toFixed(1)] ? (
              <Text
                style={{
                  color: getRatingColor(rating),
                  marginBottom: 4,
                  textAlign: 'center',
                }}
              >
                {tooltips[rating.toFixed(1)]}
              </Text>
            ) : (
              <Text style={{ marginBottom: 4 }} />
            )}
            {/* Rating (Number) */}
            <Text>
              <Text style={[styles.ratingValue, { color: getRatingColor(rating) }]}>
                {rating === 0 ? getRatingText(rating) : `${getRatingText(rating)}/10`}
              </Text>
            </Text>
            {/* Stars */}
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