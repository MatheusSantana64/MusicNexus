// src/Profile/ProfileScreen.tsx
// ProfileScreen for displaying user profile and statistics
import React, { useMemo, useState } from 'react';
import { View, Text, Alert, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMusicStore } from '../store/musicStore';
import { useTagStore } from '../store/tagStore';
import { getDocs, collection, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ProfileConfigModal } from './ProfileConfigModal';
import { RatingTipsModal } from './RatingTipsModal';
import { TidalAccountModal } from './TidalAccountModal';
import { calculateProfileStats } from './profileStatsUtils';
import { profileScreenStyles as styles } from './styles/ProfileScreen.styles';
import { getRatingText, getRatingColor } from '../utils/ratingUtils';
import { theme } from '../styles/theme';

type DistMode = 'ratings' | 'years' | 'tags';
const DIST_MODES: DistMode[] = ['ratings', 'years', 'tags'];

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
  const [tipsModalVisible, setTipsModalVisible] = useState(false);
  const [accountModalVisible, setAccountModalVisible] = useState(false);
  const [distMode, setDistMode] = useState<DistMode>('ratings');

  const stats = useMemo(() => calculateProfileStats(savedMusic, tags), [savedMusic, tags]);

  const cycleMode = () => {
    setDistMode(prev => DIST_MODES[(DIST_MODES.indexOf(prev) + 1) % DIST_MODES.length]);
  };

  const activeRatings = useMemo(() => {
    return Object.entries(stats.ratingCounts)
      .filter(([, count]) => count > 0)
      .sort((a, b) => parseFloat(b[0]) - parseFloat(a[0]));
  }, [stats.ratingCounts]);

  const activeYears = useMemo(() => {
    return Object.entries(stats.yearCounts)
      .filter(([, count]) => count > 0)
      .sort((a, b) => b[0].localeCompare(a[0]));
  }, [stats.yearCounts]);

  const activeTags = useMemo(() => {
    return Object.entries(stats.tagCounts)
      .filter(([, count]) => count > 0)
      .sort((a, b) => {
        const tagA = tags.find(t => t.name === a[0]);
        const tagB = tags.find(t => t.name === b[0]);
        if (tagA && tagB) return tagA.position - tagB.position;
        if (tagA) return -1;
        if (tagB) return 1;
        return b[1] - a[1];
      });
  }, [stats.tagCounts, tags]);

  const distEntries = distMode === 'ratings' ? activeRatings : distMode === 'years' ? activeYears : activeTags;
  const maxCount = Math.max(1, ...distEntries.map(([, c]) => c));

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <ProfileConfigModal
          visible={modalVisible}
          onOpen={() => setModalVisible(true)}
          onClose={() => setModalVisible(false)}
          onOpenAccount={() => setAccountModalVisible(true)}
          onOpenTips={() => setTipsModalVisible(true)}
          onDeleteAllSongs={deleteAllSongs}
          onDeleteAllTags={deleteAllTags}
        />
        <RatingTipsModal
          visible={tipsModalVisible}
          onClose={() => setTipsModalVisible(false)}
        />
        <TidalAccountModal
          visible={accountModalVisible}
          onClose={() => setAccountModalVisible(false)}
        />
        <View style={styles.headerBar} />
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionTitle}>Stats</Text>

          <View style={styles.heroRow}>
            <View style={styles.heroCard}>
              <Ionicons name="musical-notes" size={22} color="cornflowerblue" style={{ marginBottom: 2 }} />
              <Text style={styles.heroNumber}>{stats.totalSongs}</Text>
              <Text style={styles.heroLabel}>Songs</Text>
            </View>
            <View style={styles.heroCard}>
              <Ionicons name="disc" size={22} color="lightcoral" style={{ marginBottom: 2 }} />
              <Text style={styles.heroNumber}>{stats.totalAlbums}</Text>
              <Text style={styles.heroLabel}>Albums</Text>
            </View>
            <View style={styles.heroCard}>
              <Ionicons name="person" size={22} color="lightpink" style={{ marginBottom: 2 }} />
              <Text style={styles.heroNumber}>{stats.totalArtists}</Text>
              <Text style={styles.heroLabel}>Artists</Text>
            </View>
          </View>

          <View style={styles.ratingSection}>
            <Pressable style={styles.ratingHeader} onPress={cycleMode}>
              <View style={styles.ratingTitleRow}>
                <Text style={styles.ratingSectionTitle}>
                  {distMode === 'ratings' ? 'Rating' : distMode === 'years' ? 'Year' : 'Tag'} Distribution
                </Text>
                <Ionicons name="swap-horizontal" size={16} color={theme.colors.text.muted} style={{ marginLeft: 6 }} />
              </View>
              {distMode === 'ratings' && (
                <View style={styles.avgBadge}>
                  <Text style={styles.avgBadgeText}>Avg: {stats.avgRating}</Text>
                </View>
              )}
            </Pressable>
            {distEntries.map(([key, count]) => {
              const color = distMode === 'ratings'
                ? getRatingColor(Number(key))
                : distMode === 'years'
                  ? 'mediumpurple'
                  : tags.find(t => t.name === key)?.color ?? 'mediumseagreen';
              const label = distMode === 'ratings' ? getRatingText(Number(key)) : key;
              return (
                <View key={key} style={styles.ratingBarRow}>
                  <Text style={styles.ratingBarLabel} numberOfLines={1}>{label}</Text>
                  <View style={styles.ratingBarTrack}>
                    <View
                      style={[
                        styles.ratingBarFill,
                        { width: `${(count / maxCount) * 100}%`, backgroundColor: color },
                      ]}
                    />
                  </View>
                  <Text style={styles.ratingBarCount}>{count}</Text>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
