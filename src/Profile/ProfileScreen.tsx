import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Button, Alert, Modal, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, Keyboard, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import { useMusicStore } from '../store/musicStore';
import { useTagStore } from '../store/tagStore';
import { getDocs, collection, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context'; // <-- Add this import

async function deleteAllSongs() {
  try {
    const snapshot = await getDocs(collection(db, 'savedMusic'));
    const deletePromises = snapshot.docs.map(d => deleteDoc(doc(db, 'savedMusic', d.id)));
    await Promise.all(deletePromises);
    Alert.alert('Success', 'All songs have been deleted.');
    // Reload music in Zustand store
    useMusicStore.getState().loadMusic();
  } catch (error) {
    Alert.alert('Error', 'Failed to delete all songs.');
  }
}

async function deleteAllTags() {
  try {
    const snapshot = await getDocs(collection(db, 'tags'));
    const deletePromises = snapshot.docs.map(d => deleteDoc(doc(db, 'tags', d.id)));
    await Promise.all(deletePromises);
    Alert.alert('Success', 'All tags have been deleted.');
    useTagStore.getState().loadTags(); // <-- reload tags in Zustand store
  } catch (error) {
    Alert.alert('Error', 'Failed to delete all tags.');
  }
}

export default function ProfileScreen() {
  const { savedMusic } = useMusicStore();
  const { tags } = useTagStore(); // <-- Get tags from store
  const [modalVisible, setModalVisible] = useState(false);

  // Notes state
  const [notes, setNotes] = useState('');
  // Keyboard state
  const [keyboardUp, setKeyboardUp] = useState(false);

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => setKeyboardUp(true));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardUp(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Load notes from cache
  React.useEffect(() => {
    AsyncStorage.getItem('profileNotes').then(val => {
      if (val !== null) setNotes(val);
    });
  }, []);
  // Save notes to cache
  const handleNotesChange = (text: string) => {
    setNotes(text);
    AsyncStorage.setItem('profileNotes', text);
  };

  // Calculate stats
  const stats = useMemo(() => {
    const totalSongs = savedMusic.length;
    const albumSet = new Set(savedMusic.map(m => m.albumId));
    const totalAlbums = albumSet.size;
    const artistSet = new Set(savedMusic.map(m => m.artist));
    const totalArtists = artistSet.size;
    const ratings = savedMusic.map(m => m.rating).filter(r => r > 0);
    const avgRating = ratings.length > 0
      ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(2)
      : 'N/A';

    // Ratings column
    const ratingCounts: Record<string, number> = {};
    for (let r = 0; r <= 10; r += 0.5) {
      ratingCounts[r.toFixed(1)] = 0;
    }
    savedMusic.forEach(m => {
      if (m.rating !== undefined && m.rating !== null) {
        const key = m.rating.toFixed(1);
        if (ratingCounts[key] !== undefined) {
          ratingCounts[key]++;
        }
      }
    });

    // Year column
    const yearCounts: Record<string, number> = {};
    savedMusic.forEach(m => {
      const year = m.releaseDate ? new Date(m.releaseDate).getFullYear().toString() : 'Unknown';
      yearCounts[year] = (yearCounts[year] || 0) + 1;
    });

    // Tags column (by name)
    const tagCounts: Record<string, number> = {};
    savedMusic.forEach(m => {
      if (Array.isArray(m.tags)) {
        m.tags.forEach(tagId => {
          const tagObj = tags.find(t => t.id === tagId);
          const tagName = tagObj ? tagObj.name : tagId;
          tagCounts[tagName] = (tagCounts[tagName] || 0) + 1;
        });
      }
    });

    return { totalSongs, totalAlbums, totalArtists, avgRating, ratingCounts, yearCounts, tagCounts };
  }, [savedMusic, tags]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        {/* Fixed Gear Icon */}
        <TouchableOpacity
          onPress={() => setModalVisible(true)}
          style={styles.gearIcon}
        >
          <Ionicons name="settings-outline" size={28} color={theme.colors.text.primary} />
        </TouchableOpacity>
        {/* Notes Section */}
        <KeyboardAvoidingView
          behavior="padding"
          keyboardVerticalOffset={12}
          style={styles.notesContainer}
        >
          <Text style={[ styles.sectionTitle, { marginBottom: 6 }]}>Notes</Text>
          <TextInput
            style={styles.notesInput}
            placeholder="Write your notes here..."
            placeholderTextColor={theme.colors.text.secondary}
            multiline
            value={notes}
            onChangeText={handleNotesChange}
          />
        </KeyboardAvoidingView>
        {/* Stats Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Stats</Text>
          {/* Stats Row */}
          <View style={styles.statsRow}>
            <Text style={styles.sectionBody}>Songs: {stats.totalSongs}</Text>
            <Text style={styles.sectionBody}>Albums: {stats.totalAlbums}</Text>
            <Text style={styles.sectionBody}>Artists: {stats.totalArtists}</Text>
          </View>
          <View style={[styles.statsRow, {justifyContent: 'center'}]}>
            <Text style={styles.sectionBody}>Average Rating: {stats.avgRating}</Text>
          </View>
          {/* Fixed column headers and columns */}
          <View style={{ flex: 1 }}>
            {/* Headers & Columns */}
            <View style={{ flexDirection: 'row', marginTop: 12 }}>
              {/* Ratings Column */}
              <View style={{ flex: 1, alignItems: 'center' }}>
                <View>
                  <Text style={[styles.sectionBody, { fontWeight: 'bold', marginBottom: 4, color: theme.colors.gold }]}>Ratings</Text>
                  <ScrollView style={{ width: '100%' }}>
                    {Object.entries(stats.ratingCounts)
                      .sort((a, b) => parseFloat(b[0]) - parseFloat(a[0]))
                      .map(([rating, count]) => (
                        <Text key={rating} style={styles.sectionBody}>
                          {rating}: {count}
                        </Text>
                      ))}
                  </ScrollView>
                </View>
              </View>
              {/* Year Column */}
              <View style={{ flex: 1, alignItems: 'center' }}>
                <View>
                  <Text style={[styles.sectionBody, { fontWeight: 'bold', marginBottom: 4, color: 'mediumpurple' }]}>Year</Text>
                  <ScrollView style={{ width: '100%' }}>
                    {Object.entries(stats.yearCounts)
                      .sort((a, b) => b[0].localeCompare(a[0]))
                      .map(([year, count]) => (
                        <Text key={year} style={styles.sectionBody}>
                          {year}: {count}
                        </Text>
                      ))}
                  </ScrollView>
                </View>
              </View>
              {/* Tags Column */}
              <View style={{ flex: 1, alignItems: 'center' }}>
                <View>
                  <Text style={[styles.sectionBody, { fontWeight: 'bold', marginBottom: 4, color: 'mediumseagreen' }]}>Tags</Text>
                  <ScrollView style={{ width: '100%' }}>
                    {Object.entries(stats.tagCounts)
                      .sort((a, b) => b[1] - a[1])
                      .map(([tagName, count]) => (
                        <Text key={tagName} style={styles.sectionBody}>
                          {tagName}: {count}
                        </Text>
                      ))}
                  </ScrollView>
                </View>
              </View>
            </View>
          </View>
        </View>
        {/* Configurations Modal */}
        <Modal
          visible={modalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.sectionTitle}>Configurations</Text>
              <View style={{ marginBottom: 12 }}>
                <Button
                  title="Delete All Songs"
                  color={theme.colors.button.delete}
                  onPress={() =>
                    Alert.alert(
                      'Delete All Songs',
                      'Are you sure you want to delete all songs? This cannot be undone.',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Delete', style: 'destructive', onPress: deleteAllSongs },
                      ]
                    )
                  }
                />
              </View>
              <View>
                <Button
                  title="Delete All Tags"
                  color={theme.colors.button.delete}
                  onPress={() =>
                    Alert.alert(
                      'Delete All Tags',
                      'Are you sure you want to delete all tags? This cannot be undone.',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Delete', style: 'destructive', onPress: deleteAllTags },
                      ]
                    )
                  }
                />
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background.amoled,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.amoled,
    paddingHorizontal: 20,
  },


  gearIcon: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
  },


  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: 24,
    textAlign: 'center',
    flex: 1,
  },
  section: {
    flex: 1, // Fill remaining space
    color: theme.colors.text.primary,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text.blue,
    marginBottom: 12,
  },
  sectionBody: {
    fontSize: 16,
    color: theme.colors.text.primary,
    marginBottom: 6,
    textAlign: 'center',

  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: theme.colors.background.amoled,
    borderRadius: 16,
    borderColor: theme.colors.border,
    borderWidth: 1,
    padding: 24,
    width: '85%',
    alignItems: 'center',
  },
  closeButton: {
    marginTop: 24,
    backgroundColor: theme.colors.button.cancel,
    paddingVertical: 10,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  closeButtonText: {
    color: theme.colors.text.primary,
    fontWeight: 'bold',
    fontSize: 16,
  },

  // Notes styles
  notesContainer: {
    justifyContent: 'flex-end',
    marginTop: 24,
    marginBottom: 12,
  },
  notesInput: {
    minHeight: 80,
    maxHeight: 160,
    backgroundColor: theme.colors.background.surface,
    color: theme.colors.text.primary,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 8,
  },
});