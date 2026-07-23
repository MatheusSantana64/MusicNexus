// src/Profile/ProfileConfigModal.tsx
// ProfileConfigModal for configuring profile settings
import React from 'react';
import { View, Text, Button, Modal, TouchableOpacity, Alert, ActivityIndicator, ScrollView, TextInput, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import { profileScreenStyles as styles } from './styles/ProfileScreen.styles';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getProfileData, setProfileData, subscribeToProfileChanges } from '../services/profileService';
import { useMusicStore } from '../store/musicStore';
import { MusicTrack } from '../types';
import { MusicSearchService } from '../services/music/musicSearchService';
import { migrateSavedMusicToTidal, approveTidalMigration, isAlreadyTidalTrack, MigrationProgress, MigrationSummary, MigrationLogEntry } from '../services/migration/tidalMigrationService';
import { MusicItem } from '../components/MusicItem';
import { getTidalTrackById } from '../services/tidal/tidalApiClient';

const RATING_STEPS = Array.from({ length: 21 }, (_, i) => (i * 0.5).toFixed(1)).reverse();

interface ProfileConfigModalProps {
  visible: boolean;
  onClose: () => void;
  onDeleteAllSongs: () => void;
  onDeleteAllTags: () => void;
  onOpen: () => void;
  onOpenAccount: () => void;
}

export function ProfileConfigModal({
  visible,
  onClose,
  onDeleteAllSongs,
  onDeleteAllTags,
  onOpen,
  onOpenAccount,
}: ProfileConfigModalProps) {
  const [tooltips, setTooltips] = React.useState<{ [rating: string]: string }>({});
  const [migrationProgress, setMigrationProgress] = React.useState<MigrationProgress | null>(null);
  const [migrationSummary, setMigrationSummary] = React.useState<MigrationSummary | null>(null);
  const [showMigrationLog, setShowMigrationLog] = React.useState(false);
  const [migrationLog, setMigrationLog] = React.useState<MigrationLogEntry[]>([]);
  const [isMigrating, setIsMigrating] = React.useState(false);
  const [searchingMigrationEntry, setSearchingMigrationEntry] = React.useState<MigrationLogEntry | null>(null);
  const [migrationSearchQuery, setMigrationSearchQuery] = React.useState('');
  const [migrationSearchResults, setMigrationSearchResults] = React.useState<MusicTrack[]>([]);
  const [migrationSearchLoading, setMigrationSearchLoading] = React.useState(false);
  const [isApprovingMigration, setIsApprovingMigration] = React.useState(false);
  const { savedMusic } = useMusicStore();
  const migratableSavedMusic = savedMusic.filter(track => !isAlreadyTidalTrack(track));

  const normalizeSearchValue = React.useCallback((value: string) => {
    return value
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\((?:[^()]*?)\)/g, ' ')
      .replace(/\[(?:[^[\]]*?)\]/g, ' ')
      .replace(/\s*-\s*(remaster|remastered|radio edit|edit|live|version|explicit|clean).*$/i, '')
      .replace(/\b(feat\.?|ft\.?|featuring)\b/gi, ' ')
      .replace(/[^a-z0-9]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }, []);

  const stripTrailingNoise = React.useCallback((value: string) => {
    return value
      .replace(/\((?:[^()]*?)\)\s*$/g, '')
      .replace(/\[(?:[^[\]]*?)\]\s*$/g, '')
      .replace(/\s*-\s*(remaster|remastered|radio edit|edit|live|version|explicit|clean).*$/i, '')
      .trim();
  }, []);

  const splitArtistAlbumQuery = React.useCallback((query: string) => {
    const parts = query.split(/\s+-\s+/);
    if (parts.length < 2) return null;
    const artist = parts.shift()?.trim() || '';
    const album = parts.join(' - ').trim();
    if (!artist || !album) return null;
    return { artist, album };
  }, []);

  const buildMigrationSearchQueries = React.useCallback((query: string) => {
    const trimmed = query.trim();
    const artistAlbum = splitArtistAlbumQuery(trimmed);
    const normalized = normalizeSearchValue(trimmed);
    const stripped = stripTrailingNoise(trimmed);
    const normalizedStripped = normalizeSearchValue(stripped);

    const queries = [trimmed, stripped, normalized, normalizedStripped];

    if (artistAlbum) {
      const artist = artistAlbum.artist;
      const album = artistAlbum.album;
      const artistStripped = stripTrailingNoise(artist);
      const albumStripped = stripTrailingNoise(album);
      const normalizedArtist = normalizeSearchValue(artist);
      const normalizedAlbum = normalizeSearchValue(album);
      const normalizedArtistStripped = normalizeSearchValue(artistStripped);
      const normalizedAlbumStripped = normalizeSearchValue(albumStripped);
      const albumCore = normalizeSearchValue(album.replace(/\s*-\s*the\s+\d+(?:st|nd|rd|th)?\s+mini\s+album.*$/i, ''));
      const albumCoreParens = normalizeSearchValue(album.replace(/\s*\((?:the\s+\d+(?:st|nd|rd|th)?\s+mini\s+album.*)\)\s*$/i, ''));

      queries.push(
        `${artist} ${album}`.trim(),
        `${normalizedArtist} ${normalizedAlbum}`.trim(),
        `${artistStripped} ${albumStripped}`.trim(),
        `${normalizedArtistStripped} ${normalizedAlbumStripped}`.trim(),
        `${artist} ${albumCore}`.trim(),
        `${normalizedArtist} ${albumCore}`.trim(),
        `${artist} ${albumCoreParens}`.trim(),
        `${normalizedArtist} ${albumCoreParens}`.trim(),
        albumCore,
        albumCoreParens,
        `${artist} ${album}`.trim(),
      );
    }

    return [...new Set(queries.map(item => item.trim()).filter(Boolean))];
  }, [normalizeSearchValue, splitArtistAlbumQuery, stripTrailingNoise]);

  React.useEffect(() => {
    let unsub: (() => void) | undefined;
    if (visible) {
      // Load from local AsyncStorage cache first (for offline support)
      AsyncStorage.getItem('ratingTooltips').then(val => {
        if (val) setTooltips(JSON.parse(val));
      });
      
      // Then try to sync with Firestore and update local cache if needed
      getProfileData().then(data => {
        if (data.ratingTooltips) {
          setTooltips(data.ratingTooltips);
          // Update AsyncStorage cache if it differs
          AsyncStorage.setItem('ratingTooltips', JSON.stringify(data.ratingTooltips));
        }
      }).catch(() => {
        // Ignore errors; local cache is already loaded
      });
      
      // Subscribe to live updates while modal is visible
      unsub = subscribeToProfileChanges((data) => {
        if (data.ratingTooltips) {
          setTooltips(data.ratingTooltips);
          // Update AsyncStorage cache
          AsyncStorage.setItem('ratingTooltips', JSON.stringify(data.ratingTooltips));
        }
      });
    }

    return () => { if (unsub) unsub(); };
  }, [visible]);

  const handleTooltipChange = (rating: string, text: string) => {
    const updated = { ...tooltips, [rating]: text };
    setTooltips(updated);
    AsyncStorage.setItem('ratingTooltips', JSON.stringify(updated));
    setProfileData({ ratingTooltips: updated }); // Save to Firestore
  };

  const handleMigrateToTidal = async () => {
    if (migratableSavedMusic.length === 0) {
      Alert.alert('No Songs to Migrate', 'All saved songs already have TIDAL artwork and will be skipped.');
      return;
    }

    Alert.alert(
      'Select Target Platform',
      'Choose the platform to which your saved songs should be migrated.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'TIDAL', style: 'default', onPress: confirmTidalMigration },
      ]
    );
  };

  const confirmTidalMigration = () => {
    Alert.alert(
      'Migrate Saved Music to TIDAL',
      `This will search TIDAL for matches to your ${migratableSavedMusic.length} non-TIDAL saved songs and update their platform metadata (track ID, artist ID, album ID, artwork, etc.) while preserving all your local MusicNexus data (ratings, tags, savedAt, ratingHistory, firebaseId).\n\nSongs that already have TIDAL artwork will be skipped. Songs that cannot be confidently matched will be logged and left unchanged.\n\nProceed with migration?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Migrate', style: 'default', onPress: () => startMigration() },
      ]
    );
  };

  const startMigration = async () => {
    setIsMigrating(true);
    setMigrationProgress(null);
    setMigrationSummary(null);
    setMigrationLog([]);

    try {
      await migrateSavedMusicToTidal(
        savedMusic,
        (progress) => {
          setMigrationProgress(progress);
        },
        (summary) => {
          setMigrationSummary(summary);
          setMigrationLog(summary.migrationLog);
          setIsMigrating(false);
          if (summary.successful > 0) {
            useMusicStore.getState().loadMusic();
          }
        }
      );
    } catch (error) {
      console.error('Migration error:', error);
      Alert.alert('Migration Failed', 'An error occurred during migration. Please try again.');
      setIsMigrating(false);
    }
  };

  const handleViewMigrationLog = () => {
    setShowMigrationLog(true);
  };

  const handleCloseMigrationLog = () => {
    setShowMigrationLog(false);
  };

  const openMigrationEntry = (entry: MigrationLogEntry) => {
    setSearchingMigrationEntry(entry);
    setMigrationSearchQuery(`${entry.originalTrack.title} ${entry.originalTrack.artist}`.trim());
    setMigrationSearchResults([]);
  };

  const closeMigrationSearch = () => {
    if (!isApprovingMigration && !migrationSearchLoading) {
      setSearchingMigrationEntry(null);
      setMigrationSearchQuery('');
      setMigrationSearchResults([]);
    }
  };

  const runMigrationSearch = React.useCallback(async (query: string) => {
    if (!searchingMigrationEntry) return;
    const trimmed = query.trim();
    setMigrationSearchQuery(query);

    if (!trimmed) {
      setMigrationSearchResults([]);
      return;
    }

    try {
      setMigrationSearchLoading(true);

      if (/^\d+$/.test(trimmed)) {
        const track = await getTidalTrackById(trimmed);
        if (track) {
          setMigrationSearchResults([track]);
          return;
        }
      }

      const queries = buildMigrationSearchQueries(trimmed);
      const isArtistAlbumSearch = Boolean(splitArtistAlbumQuery(trimmed));
      const searchMode = isArtistAlbumSearch ? 'tidal_album' : 'tidal_quick';
      let bestResults: MusicTrack[] = [];
      let bestScore = -1;

      for (const candidateQuery of queries) {
        const results = await MusicSearchService.searchTracks(candidateQuery, searchMode, 25);
        if (results.length === 0) continue;

        const candidateScore = results.reduce((score, track) => {
          const title = normalizeSearchValue(track.title);
          const artist = normalizeSearchValue(track.artist.name);
          const album = normalizeSearchValue(track.album.title);
          const queryTokens = normalizeSearchValue(candidateQuery).split(' ');
          const titleHit = queryTokens.some(token => token && title.includes(token));
          const artistHit = queryTokens.some(token => token && artist.includes(token));
          const albumHit = queryTokens.some(token => token && album.includes(token));
          return score + (titleHit ? 1 : 0) + (artistHit ? 2 : 0) + (albumHit ? 2 : 0);
        }, 0);

        if (candidateScore > bestScore) {
          bestScore = candidateScore;
          bestResults = results;
        }

        if (bestScore >= 4) {
          break;
        }
      }

      setMigrationSearchResults(bestResults);
    } catch (error) {
      Alert.alert('Search Failed', error instanceof Error ? error.message : 'Could not search TIDAL.');
    } finally {
      setMigrationSearchLoading(false);
    }
  }, [buildMigrationSearchQueries, normalizeSearchValue, searchingMigrationEntry, splitArtistAlbumQuery]);

  React.useEffect(() => {
    if (!searchingMigrationEntry) return;
    const handle = setTimeout(() => {
      runMigrationSearch(migrationSearchQuery);
    }, 350);
    return () => clearTimeout(handle);
  }, [migrationSearchQuery, searchingMigrationEntry, runMigrationSearch]);

  const approveSelectedMigration = async (selectedTrack: MusicTrack) => {
    if (!searchingMigrationEntry) return;

    setIsApprovingMigration(true);
    try {
      await approveTidalMigration(searchingMigrationEntry.originalTrack, selectedTrack);
      setMigrationLog(current => current.filter(entry => entry !== searchingMigrationEntry));
      setMigrationSummary(current => current ? {
        ...current,
        successful: current.successful + 1,
        failed: Math.max(0, current.failed - 1),
        results: current.results.map(result =>
          result.originalTrack.firebaseId === searchingMigrationEntry.originalTrack.firebaseId
            ? { ...result, success: true, matchedTrack: selectedTrack, error: undefined }
            : result
        ),
        migrationLog: current.migrationLog.filter(entry => entry !== searchingMigrationEntry),
      } : current);
      setSearchingMigrationEntry(null);
      setMigrationSearchQuery('');
      setMigrationSearchResults([]);
      useMusicStore.getState().loadMusic();
      Alert.alert('Migration Approved', 'The selected TIDAL match was applied successfully.');
    } catch (error) {
      Alert.alert('Migration Failed', error instanceof Error ? error.message : 'The selected match could not be applied.');
    } finally {
      setIsApprovingMigration(false);
    }
  };

  return (
    <>
      <TouchableOpacity onPress={onOpenAccount} style={[styles.gearIcon, { right: 56 }]}>
          <Ionicons name="person-circle-outline" size={28} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={onOpen} style={styles.gearIcon}>
          <Ionicons name="settings-outline" size={28} color={theme.colors.text.primary} />
        </TouchableOpacity>
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={onClose}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.configSectionTitle}>Configurations</Text>
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
                      { text: 'Delete', style: 'destructive', onPress: onDeleteAllSongs },
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
                      { text: 'Delete', style: 'destructive', onPress: onDeleteAllTags },
                    ]
                  )
                }
              />
            </View>
            <Text style={[styles.configSectionTitle, { marginTop: 16 }]}>Rating Tooltips</Text>
            <ScrollView style={{ maxHeight: 220, alignSelf: 'stretch', width: '100%' }}>
              {RATING_STEPS.map(rating => (
                <View
                  key={rating}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginBottom: 8,
                    width: '100%',
                  }}
                >
                  <Text style={{ width: 40, color: theme.colors.text.primary, marginRight: 8 }}>{rating}</Text>
                  <TextInput
                    style={{
                      flex: 1,
                      borderWidth: 1,
                      borderColor: '#333',
                      borderRadius: 6,
                      padding: 4,
                      color: theme.colors.text.primary,
                      backgroundColor: theme.colors.background.surface,
                      fontSize: 15,
                    }}
                    placeholder={`Tooltip for ${rating}`}
                    placeholderTextColor="#888"
                    value={tooltips[rating] || ''}
                    onChangeText={text => handleTooltipChange(rating, text)}
                  />
                </View>
              ))}
            </ScrollView>

            {/* Migration Section */}
            <Text style={[styles.configSectionTitle, { marginTop: 16 }]}>Migration</Text>
            <View style={{ marginBottom: 12 }}>
              <Button
                title={isMigrating ? 'Migrating...' : 'Migrate Songs to Another Platform'}
                color={theme.colors.button.primary}
                onPress={handleMigrateToTidal}
                disabled={isMigrating || migratableSavedMusic.length === 0}
              />
              {migratableSavedMusic.length === 0 && (
                <Text style={{ color: theme.colors.text.secondary, fontSize: 12, marginTop: 4 }}>
                  All saved songs already have TIDAL metadata
                </Text>
              )}
            </View>

            {/* Migration Progress */}
            {migrationProgress && isMigrating && (
              <View style={{ marginBottom: 12, padding: 12, backgroundColor: theme.colors.background.surface, borderRadius: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ color: theme.colors.text.primary, fontWeight: '600' }}>
                    Migrating: {migrationProgress.current}/{migrationProgress.total}
                  </Text>
                  <ActivityIndicator size="small" color={theme.colors.button.primary} />
                </View>
                <Text style={{ color: theme.colors.text.secondary, fontSize: 13 }}>
                  {migrationProgress.currentTrack}
                </Text>
                <View style={{ marginTop: 8 }}>
                  <View
                    style={{
                      height: 6,
                      backgroundColor: theme.colors.background.surface,
                      borderRadius: 3,
                      overflow: 'hidden',
                    }}
                  >
                    <View
                      style={{
                        height: '100%',
                        width: `${(migrationProgress.current / migrationProgress.total) * 100}%`,
                        backgroundColor: theme.colors.button.primary,
                      }}
                    />
                  </View>
                </View>
              </View>
            )}

            {/* Migration Summary */}
            {migrationSummary && !isMigrating && (
              <View style={{ marginBottom: 12, padding: 12, backgroundColor: theme.colors.background.surface, borderRadius: 8 }}>
                <Text style={{ color: theme.colors.text.primary, fontWeight: '600', marginBottom: 8 }}>
                  Migration Complete
                </Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ color: theme.colors.text.secondary }}>Total Processed:</Text>
                  <Text style={{ color: theme.colors.text.primary, fontWeight: '600' }}>{migrationSummary.total}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ color: theme.colors.text.secondary }}>Successful:</Text>
                  <Text style={{ color: theme.colors.text.success, fontWeight: '600' }}>{migrationSummary.successful}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ color: theme.colors.text.secondary }}>Failed:</Text>
                  <Text style={{ color: theme.colors.text.error, fontWeight: '600' }}>{migrationSummary.failed}</Text>
                </View>
                {migrationSummary.failed > 0 && (
                  <Button
                    title="View Migration Log"
                    color={theme.colors.button.primary}
                    onPress={handleViewMigrationLog}
                  />
                )}
              </View>
            )}

            {/* Migration Log Modal */}
            {showMigrationLog && migrationLog.length > 0 && (
              <Modal visible={true} transparent animationType="slide" onRequestClose={handleCloseMigrationLog}>
                <View style={styles.modalOverlay}>
                  <View style={styles.modalContent}>
                    <Text style={styles.configSectionTitle}>Migration Log - Unmatched Songs</Text>
                    <ScrollView style={{ maxHeight: 300, width: '100%' }}>
                      {migrationLog.map((entry, index) => (
                        <View key={index} style={{ marginBottom: 12, padding: 12, backgroundColor: theme.colors.background.surface, borderRadius: 8 }}>
                          <TouchableOpacity onPress={() => openMigrationEntry(entry)} disabled={isApprovingMigration || migrationSearchLoading}>
                            <Text style={{ color: theme.colors.text.primary, fontWeight: '600' }}>
                              {entry.originalTrack.title} - {entry.originalTrack.artist}
                            </Text>
                            <Text style={{ color: theme.colors.text.secondary, fontSize: 12, marginTop: 2 }}>
                              Album: {entry.originalTrack.album}
                            </Text>
                            <Text style={{ color: theme.colors.text.secondary, fontSize: 12 }}>
                              Track: {entry.originalTrack.trackPosition} | Disk: {entry.originalTrack.diskNumber} | Duration: {entry.originalTrack.duration}s
                            </Text>
                            <Text style={{ color: theme.colors.button.delete, fontSize: 12, marginTop: 4 }}>
                              Reason: {entry.reason}
                            </Text>
                            <Text style={{ color: theme.colors.text.muted, fontSize: 11, marginTop: 2 }}>
                              {new Date(entry.timestamp).toLocaleString()}
                            </Text>
                          </TouchableOpacity>
                          <Button
                            title="Search TIDAL Matches"
                            color={theme.colors.button.primary}
                            onPress={() => openMigrationEntry(entry)}
                            disabled={isApprovingMigration || migrationSearchLoading}
                          />
                        </View>
                      ))}
                    </ScrollView>
                    <TouchableOpacity onPress={handleCloseMigrationLog} style={styles.closeButton}>
                      <Text style={styles.closeButtonText}>Close</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Modal>
            )}

            {/* Migration Search */}
            {searchingMigrationEntry && (
              <Modal visible transparent animationType="slide" onRequestClose={closeMigrationSearch}>
                <View style={styles.modalOverlay}>
                  <View style={styles.modalContent}>
                    <Text style={styles.configSectionTitle}>Search TIDAL Matches</Text>
                    <Text style={{ color: theme.colors.text.secondary, marginBottom: 12 }}>
                      You are migrating the song {searchingMigrationEntry.originalTrack.title} by {searchingMigrationEntry.originalTrack.artist} on {searchingMigrationEntry.originalTrack.album}.
                    </Text>
                    <View style={{ width: '100%', padding: 12, backgroundColor: theme.colors.background.surface, borderRadius: 8, marginBottom: 10 }}>
                      <Text style={{ color: theme.colors.text.primary, fontWeight: '600', marginBottom: 6 }}>Search</Text>
                      <TextInput
                        style={{
                          borderWidth: 1,
                          borderColor: theme.colors.border,
                          borderRadius: 6,
                          padding: 8,
                          color: theme.colors.text.primary,
                          backgroundColor: theme.colors.background.surface,
                        }}
                        autoFocus
                        placeholder='Search TIDAL... or "Artist - Album"'
                        placeholderTextColor={theme.colors.text.muted}
                        value={migrationSearchQuery}
                        onChangeText={setMigrationSearchQuery}
                        autoCorrect={false}
                        autoCapitalize="none"
                      />
                    </View>
                    {migrationSearchLoading ? (
                      <ActivityIndicator size="small" color={theme.colors.button.primary} />
                    ) : (
                      <FlatList
                        data={migrationSearchResults}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => (
                          <View style={{ marginBottom: 10 }}>
                            <MusicItem
                              music={item}
                              onPress={approveSelectedMigration}
                            />
                          </View>
                        )}
                        ListEmptyComponent={() => (
                          <Text style={{ color: theme.colors.text.secondary, textAlign: 'center', marginVertical: 16 }}>
                            No matches yet. Try a different title, artist, album, or `Artist - Album` search.
                          </Text>
                        )}
                        style={{ width: '100%', maxHeight: 420 }}
                      />
                    )}
                    <TouchableOpacity onPress={closeMigrationSearch} disabled={isApprovingMigration || migrationSearchLoading} style={styles.closeButton}>
                      <Text style={styles.closeButtonText}>Close</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Modal>
            )}

            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}
