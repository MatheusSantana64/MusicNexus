// src/Profile/ProfileScreen.tsx
// ProfileScreen for displaying user profile and statistics
import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, Alert, TextInput, KeyboardAvoidingView, Keyboard, ScrollView } from 'react-native';
import { theme } from '../styles/theme';
import { useMusicStore } from '../store/musicStore';
import { useTagStore } from '../store/tagStore';
import { getDocs, collection, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ProfileConfigModal } from './ProfileConfigModal';
import { calculateProfileStats } from './profileStatsUtils';
import { profileScreenStyles as styles } from './styles/ProfileScreen.styles';
import { getRatingText, getRatingColor } from '../utils/ratingUtils';
import { getProfileData, setProfileData } from '../services/profileService';

async function deleteAllSongs() {
  try {
    const snapshot = await getDocs(collection(db, 'savedMusic'));
    const deletePromises = snapshot.docs.map(d => deleteDoc(doc(db, 'savedMusic', d.id)));
    await Promise.all(deletePromises);
    Alert.alert('Success', 'All songs have been deleted.');
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
    useTagStore.getState().loadTags();
  } catch (error) {
    Alert.alert('Error', 'Failed to delete all tags.');
  }
}

export default function ProfileScreen() {
  const { savedMusic } = useMusicStore();
  const { tags } = useTagStore();
  const [modalVisible, setModalVisible] = useState(false);

  const [notes, setNotes] = useState('');
  const [keyboardUp, setKeyboardUp] = useState(false);

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => setKeyboardUp(true));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardUp(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  React.useEffect(() => {
    // Load notes from Firestore first, fallback to AsyncStorage
    getProfileData().then(data => {
      if (data.notes !== undefined) setNotes(data.notes);
      else AsyncStorage.getItem('profileNotes').then(val => { if (val !== null) setNotes(val); });
    });
  }, []);
  const handleNotesChange = (text: string) => {
    setNotes(text);
    AsyncStorage.setItem('profileNotes', text);
    setProfileData({ notes: text }); // Save to Firestore
  };

  const stats = useMemo(() => calculateProfileStats(savedMusic, tags), [savedMusic, tags]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <ProfileConfigModal
          visible={modalVisible}
          onOpen={() => setModalVisible(true)}
          onClose={() => setModalVisible(false)}
          onDeleteAllSongs={deleteAllSongs}
          onDeleteAllTags={deleteAllTags}
        />
        <KeyboardAvoidingView
          behavior="padding"
          keyboardVerticalOffset={12}
          style={styles.notesContainer}
        >
          <Text style={[styles.sectionTitle, { marginBottom: 6 }]}>Notes</Text>
          <TextInput
            style={styles.notesInput}
            placeholder="Write your notes here..."
            placeholderTextColor={theme.colors.text.secondary}
            multiline
            value={notes}
            onChangeText={handleNotesChange}
          />
        </KeyboardAvoidingView>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Stats</Text>
          <View style={styles.statsRow}>
            <Text style={[styles.sectionBody, { fontWeight: 'bold', color: 'cornflowerblue' }]}>
              Songs: {stats.totalSongs}
            </Text>
            <Text style={[styles.sectionBody, { fontWeight: 'bold', color: 'lightcoral' }]}>
              Albums: {stats.totalAlbums}
            </Text>
            <Text style={[styles.sectionBody, { fontWeight: 'bold', color: 'lightpink' }]}>
              Artists: {stats.totalArtists}
            </Text>
          </View>
          <View style={[styles.statsRow, {justifyContent: 'center'}]}>
            {/* Removed Average Rating from here */}
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', marginTop: 12 }}>
              <View style={{ flex: 1, alignItems: 'center' }}>
                <View>
                  <Text
                    style={[
                      styles.sectionBody,
                      styles.columnTitle,
                      { color: theme.colors.gold }
                    ]}
                  >
                    Ratings
                  </Text>
                  <ScrollView style={{ width: '100%' }}>
                    {Object.entries(stats.ratingCounts)
                      .sort((a, b) => parseFloat(b[0]) - parseFloat(a[0]))
                      .map(([rating, count]) => (
                        <Text
                          key={rating}
                          style={[
                            styles.sectionBody,
                            { color: getRatingColor(Number(rating)) }
                          ]}
                        >
                          {getRatingText(Number(rating))}: {count}
                        </Text>
                      ))}
                    <Text style={[styles.sectionBody, { marginTop: 8, fontWeight: 'bold' }]}>
                      Average: {stats.avgRating}
                    </Text>
                  </ScrollView>
                </View>
              </View>
              <View style={{ flex: 1, alignItems: 'center' }}>
                <View>
                  <Text
                    style={[
                      styles.sectionBody,
                      styles.columnTitle,
                      { color: 'mediumpurple' }
                    ]}
                  >
                    Year
                  </Text>
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
              <View style={{ flex: 1, alignItems: 'center' }}>
                <View>
                  <Text
                    style={[
                      styles.sectionBody,
                      styles.columnTitle,
                      { color: 'mediumseagreen' }
                    ]}
                  >
                    Tags
                  </Text>
                  <ScrollView style={{ width: '100%' }}>
                    {Object.entries(stats.tagCounts)
                      .sort((a, b) => {
                        // Sort by tag position if possible, fallback to count
                        const tagA = tags.find(t => t.name === a[0]);
                        const tagB = tags.find(t => t.name === b[0]);
                        if (tagA && tagB) return tagA.position - tagB.position;
                        if (tagA) return -1;
                        if (tagB) return 1;
                        return b[1] - a[1];
                      })
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
      </View>
    </SafeAreaView>
  );
}