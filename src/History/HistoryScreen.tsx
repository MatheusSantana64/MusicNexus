// src/History/HistoryScreen.tsx
// HistoryScreen displays the user's music rating history
import React, { useMemo } from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { useMusicStore } from '../store/musicStore';
import { getRatingText, getRatingColor } from '../utils/ratingUtils';
import { formatReleaseDate, formatDateTimeDDMMYY_HHMM } from '../utils/dateUtils';
import { Ionicons } from '@expo/vector-icons';
import { historyScreenStyles as styles } from './HistoryScreen.styles';
import { theme } from '../styles/theme';

export default function HistoryScreen() {
  const { savedMusic } = useMusicStore();

  // Flatten all rating history entries with song info
  const historyEntries = useMemo(() => {
    const entries: Array<{
      music: typeof savedMusic[number];
      oldRating: number;
      newRating: number;
      timestamp: string;
    }> = [];

    savedMusic.forEach(music => {
      const history = music.ratingHistory || [];
      if (history.length > 0) {
        // Initial rating event if first rating is not 0
        if (history[0].rating !== 0) {
          entries.push({
            music,
            oldRating: 0,
            newRating: history[0].rating,
            timestamp: history[0].timestamp,
          });
        }
        // Subsequent rating changes
        for (let i = 1; i < history.length; i++) {
          entries.push({
            music,
            oldRating: history[i - 1].rating,
            newRating: history[i].rating,
            timestamp: history[i].timestamp,
          });
        }
      }
    });

    return entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [savedMusic]);

  const renderItem = ({ item }: { item: typeof historyEntries[number] }) => {
    const { music, oldRating, newRating, timestamp } = item;
    return (
      <TouchableOpacity style={styles.container} activeOpacity={0.8}>
        <Image
          source={{ uri: music.coverUrl }}
          style={styles.albumCover}
          defaultSource={require('../../assets/icon.png')}
        />
        <View style={styles.contentContainer}>
          <View style={{ flexDirection: 'row', width: '100%' }}>
            {/* Song Info Column with Release Date */}
            <View style={styles.musicInfo}>
              <View style={styles.titleRow}>
                {music.trackPosition > 0 && (
                  <Text style={styles.trackNumber}>{music.trackPosition}. </Text>
                )}
                <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
                  {music.title}
                </Text>
              </View>
              <Text style={styles.artist} numberOfLines={1} ellipsizeMode="tail">
                {music.artist}
                <Text style={styles.album}> - {music.album}</Text>
              </Text>
              <Text style={styles.releaseDate} numberOfLines={1} ellipsizeMode="tail">
                {music.releaseDate ? formatReleaseDate(music.releaseDate) : ''}
              </Text>
            </View>
            {/* Rating Column with Saved Date */}
            <View style={styles.ratingSection}>
              <View
                style={[
                  styles.ratingContainer,
                  {
                    backgroundColor: getRatingColor(newRating) + '20',
                    flexDirection: 'row',
                    alignItems: 'center',
                  },
                ]}
              >
                <Text style={[styles.rating, { color: getRatingColor(oldRating), marginRight: 4 }]}>
                  {getRatingText(oldRating)}
                </Text>
                <Ionicons name="arrow-forward" size={16} color={theme.colors.text.muted} style={{ marginHorizontal: 2 }} />
                <Text style={[styles.rating, { color: getRatingColor(newRating), marginLeft: 4 }]}>
                  {getRatingText(newRating)}
                </Text>
              </View>
              <Text style={styles.ratingDate} numberOfLines={1} ellipsizeMode="tail">
                Rated {formatDateTimeDDMMYY_HHMM(timestamp)}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={theme.styles.container} edges={['top']}>
      <Text style={{ ...theme.styles.title, textAlign: 'center' }}>Rating History</Text>
      {historyEntries.length === 0 ? (
        <View style={theme.styles.centerContainer}>
          <Text style={theme.styles.hint}>No rating changes found.</Text>
        </View>
      ) : (
        <FlashList
          data={historyEntries}
          renderItem={renderItem}
          keyExtractor={(_, idx) => idx.toString()}
          estimatedItemSize={100}
        />
      )}
    </SafeAreaView>
  );
}