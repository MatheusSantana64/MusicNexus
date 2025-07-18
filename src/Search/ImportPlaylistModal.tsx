import React from 'react';
import { Modal, View, Text, TextInput, Button, TouchableOpacity } from 'react-native';
import StarRating from 'react-native-star-rating-widget';
import { importPlaylistModalStyles as styles } from './styles/ImportPlaylistModal.styles';

interface ImportPlaylistModalProps {
  visible: boolean;
  playlistLink: string;
  importRating: number;
  importLoading: boolean;
  importError: string | null;
  onChangeLink: (link: string) => void;
  onChangeRating: (rating: number) => void;
  onCancel: () => void;
  onImport: () => void;
}

export function ImportPlaylistModal({
  visible,
  playlistLink,
  importRating,
  importLoading,
  importError,
  onChangeLink,
  onChangeRating,
  onCancel,
  onImport,
}: ImportPlaylistModalProps) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Import Playlist from Deezer</Text>
            
            <View style={styles.ratingContainer}>
                <Text style={styles.ratingLabel}>Select the rating for the imported songs:</Text>
                <Text style={styles.ratingValue}>
                {importRating === 0 ? 'N/A' : `${importRating}/10`}
                </Text>
                <StarRating
                rating={importRating}
                onChange={onChangeRating}
                maxStars={10}
                starSize={32}
                color="#FFD700"
                emptyColor="#424242ff"
                enableHalfStar={true}
                starStyle={{ marginHorizontal: 0 }}
                />
            </View>

            <View style={{ position: 'relative' }}>
              <TextInput
                  style={styles.modalInput}
                  placeholder="Paste Deezer playlist link or ID"
                  placeholderTextColor="#888"
                  value={playlistLink}
                  onChangeText={onChangeLink}
                  autoCapitalize="none"
                  autoCorrect={false}
              />
              {playlistLink.length > 0 && (
                <TouchableOpacity
                  onPress={() => onChangeLink('')}
                  style={{
                    position: 'absolute',
                    right: 8,
                    top: 6,
                    justifyContent: 'center',
                    alignItems: 'center',
                    paddingHorizontal: 4,
                  }}
                  accessibilityLabel="Clear playlist link"
                >
                  <Text style={{ fontSize: 18, color: '#888' }}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
            {importError && <Text style={styles.errorText}>{importError}</Text>}
            <View style={styles.modalButtonRow}>
                <Button
                title="Cancel"
                onPress={onCancel}
                color="#444444"
                />
                <Button
                title={importLoading ? "Importing..." : "Import Playlist"}
                onPress={onImport}
                disabled={importLoading || !playlistLink}
                color="#003f82ff"
                />
            </View>
        </View>
      </View>
    </Modal>
  );
}