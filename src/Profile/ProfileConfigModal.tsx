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
import { approveTidalMigration } from '../services/migration/tidalMigrationService';
import { MusicItem } from '../components/MusicItem';
import { getTidalTrackById } from '../services/tidal/tidalApiClient';
import { backupAllCollections, exportLocalBackup, importLocalBackup } from '../services/backupService';
import { showToast } from '../utils/toast';

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
  const [searchQuery, setSearchQuery] = React.useState('');
  const [searchResults, setSearchResults] = React.useState<MusicTrack[]>([]);
  const [searchLoading, setSearchLoading] = React.useState(false);
  const [isApproving, setIsApproving] = React.useState(false);
  const [showDuplicateFinder, setShowDuplicateFinder] = React.useState(false);
  const [duplicateGroups, setDuplicateGroups] = React.useState<Array<{ key: string; title: string; artist: string; tracks: any[] }>>([]);
  const [duplicateTarget, setDuplicateTarget] = React.useState<any | null>(null);
  const [isBackingUp, setIsBackingUp] = React.useState(false);
  const [backupProgress, setBackupProgress] = React.useState<{ phase: string; current: number; total: number } | null>(null);
  const [isExporting, setIsExporting] = React.useState(false);
  const [exportProgress, setExportProgress] = React.useState<{ phase: string; current: number; total: number } | null>(null);
  const [isImporting, setIsImporting] = React.useState(false);
  const [importProgress, setImportProgress] = React.useState<{ phase: string; current: number; total: number } | null>(null);
  const { savedMusic } = useMusicStore();

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

  const buildSearchQueries = React.useCallback((query: string) => {
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

  const extractTidalTrackId = React.useCallback((value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return '';

    const urlMatch = trimmed.match(/tidal\.com\/track\/(\d+)/i);
    if (urlMatch?.[1]) return urlMatch[1];

    const idMatch = trimmed.match(/^(\d+)$/);
    if (idMatch?.[1]) return idMatch[1];

    return trimmed;
  }, []);

  const buildDuplicateGroups = React.useCallback(() => {
    const groups = new Map<string, any[]>();
    for (const track of savedMusic) {
      const key = String(track.id || '').trim();
      if (!key) continue;
      const bucket = groups.get(key) || [];
      bucket.push(track);
      groups.set(key, bucket);
    }

    return [...groups.entries()]
      .filter(([, tracks]) => tracks.length > 1)
      .map(([key, tracks]) => ({
        key,
        title: tracks[0]?.title || 'Unknown title',
        artist: tracks[0]?.artist || 'Unknown artist',
        tracks: tracks.sort((a, b) => {
          const aDate = a.ratingHistory?.[a.ratingHistory.length - 1]?.timestamp || a.savedAt?.toISOString?.() || '';
          const bDate = b.ratingHistory?.[b.ratingHistory.length - 1]?.timestamp || b.savedAt?.toISOString?.() || '';
          return aDate.localeCompare(bDate);
        }),
      }));
  }, [savedMusic]);

  React.useEffect(() => {
    let unsub: (() => void) | undefined;
    if (visible) {
      AsyncStorage.getItem('ratingTooltips').then(val => {
        if (val) setTooltips(JSON.parse(val));
      });

      getProfileData().then(data => {
        if (data.ratingTooltips) {
          setTooltips(data.ratingTooltips);
          AsyncStorage.setItem('ratingTooltips', JSON.stringify(data.ratingTooltips));
        }
      }).catch(() => {});

      unsub = subscribeToProfileChanges((data) => {
        if (data.ratingTooltips) {
          setTooltips(data.ratingTooltips);
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
    setProfileData({ ratingTooltips: updated });
  };

  const openDuplicateFinder = () => {
    const groups = buildDuplicateGroups();
    setDuplicateGroups(groups);
    setShowDuplicateFinder(true);
  };

  const openDuplicateTarget = (track: any) => {
    setDuplicateTarget(track);
    setSearchQuery(String(track.id || '').trim());
    setSearchResults([]);
  };

  const closeSearch = () => {
    if (!isApproving && !searchLoading) {
      setDuplicateTarget(null);
      setSearchQuery('');
      setSearchResults([]);
    }
  };

  const handleBackup = () => {
    Alert.alert(
      'Backup Firestore Data',
      'This will create a cloud backup of all your data with a timestamped collection name.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Backup', style: 'default', onPress: startBackup },
      ]
    );
  };

  const startBackup = async () => {
    setIsBackingUp(true);
    setBackupProgress(null);
    try {
      const result = await backupAllCollections((progress) => {
        setBackupProgress(progress);
      });
      setIsBackingUp(false);
      setBackupProgress(null);
      showToast(
        `Backup complete: ${result.savedMusic} songs, ${result.tags} tags, ${result.userProfile} profiles`,
        'success',
      );
    } catch (error) {
      console.error('Backup error:', error);
      setIsBackingUp(false);
      setBackupProgress(null);
      showToast('Backup failed. Check console for details.', 'error');
    }
  };

  const handleExportLocal = () => {
    Alert.alert(
      'Export Local Backup',
      'This will save all your data to a JSON file you can share or store.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Export', style: 'default', onPress: startExport },
      ]
    );
  };

  const startExport = async () => {
    setIsExporting(true);
    setExportProgress(null);
    try {
      await exportLocalBackup((progress) => {
        setExportProgress(progress);
      });
      setIsExporting(false);
      setExportProgress(null);
      showToast('Backup file ready', 'success');
    } catch (error) {
      console.error('Export error:', error);
      setIsExporting(false);
      setExportProgress(null);
      showToast('Export failed. Check console for details.', 'error');
    }
  };

  const handleImportLocal = () => {
    Alert.alert(
      'Restore from Backup',
      'This will overwrite your current data with the contents of the backup file.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Restore', style: 'destructive', onPress: startImport },
      ]
    );
  };

  const startImport = async () => {
    setIsImporting(true);
    setImportProgress(null);
    try {
      const result = await importLocalBackup((progress) => {
        setImportProgress(progress);
      });
      setIsImporting(false);
      setImportProgress(null);
      useMusicStore.getState().loadMusic();
      showToast(
        `Restore complete: ${result.savedMusic} songs, ${result.tags} tags, ${result.userProfile} profiles`,
        'success',
      );
    } catch (error) {
      console.error('Import error:', error);
      setIsImporting(false);
      setImportProgress(null);
      if (error instanceof Error && error.message === 'cancelled') return;
      showToast('Restore failed. Check console for details.', 'error');
    }
  };

  const runSearch = React.useCallback(async (query: string) => {
    if (!duplicateTarget) return;
    const trimmed = query.trim();
    const exactTrackId = extractTidalTrackId(trimmed);
    setSearchQuery(query);

    if (!trimmed) {
      setSearchResults([]);
      return;
    }

    try {
      setSearchLoading(true);

      if (/^\d+$/.test(exactTrackId)) {
        const track = await getTidalTrackById(exactTrackId);
        if (track) {
          setSearchResults([track]);
          return;
        }
      }

      const queries = buildSearchQueries(trimmed);
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

      setSearchResults(bestResults);
    } catch (error) {
      Alert.alert('Search Failed', error instanceof Error ? error.message : 'Could not search TIDAL.');
    } finally {
      setSearchLoading(false);
    }
  }, [buildSearchQueries, duplicateTarget, extractTidalTrackId, normalizeSearchValue, splitArtistAlbumQuery]);

  const submitSearch = React.useCallback(() => {
    if (!duplicateTarget) return;
    void runSearch(searchQuery);
  }, [duplicateTarget, searchQuery, runSearch]);

  const approveSelectedTrack = async (selectedTrack: MusicTrack) => {
    if (!duplicateTarget) return;

    setIsApproving(true);
    try {
      await approveTidalMigration(duplicateTarget, selectedTrack);
      setDuplicateTarget(null);
      setSearchQuery('');
      setSearchResults([]);
      useMusicStore.getState().loadMusic();
      Alert.alert('Success', 'The selected TIDAL match was applied successfully.');
    } catch (error) {
      Alert.alert('Failed', error instanceof Error ? error.message : 'The selected match could not be applied.');
    } finally {
      setIsApproving(false);
    }
  };

  const busy = isBackingUp || isExporting || isImporting;

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
            <ScrollView showsVerticalScrollIndicator={false}>
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
            <Text style={[styles.configSectionTitle, { marginTop: 16 }]}>Backup</Text>
            <View style={{ marginBottom: 12 }}>
              <Button
                title={isBackingUp ? 'Backing up...' : 'Backup to Cloud'}
                color={theme.colors.button.primary}
                onPress={handleBackup}
                disabled={busy}
              />
              {backupProgress && (
                <View style={{ marginTop: 8 }}>
                  <Text style={{ color: theme.colors.text.secondary, fontSize: 12 }}>
                    {backupProgress.phase}: {backupProgress.current}/{backupProgress.total}
                  </Text>
                  <View style={{ marginTop: 4, height: 4, backgroundColor: theme.colors.background.surface, borderRadius: 2, overflow: 'hidden' }}>
                    <View style={{ height: '100%', width: `${(backupProgress.current / backupProgress.total) * 100}%`, backgroundColor: theme.colors.button.primary }} />
                  </View>
                </View>
              )}
            </View>
            <View style={{ marginBottom: 12 }}>
              <Button
                title={isExporting ? 'Exporting...' : 'Export to File'}
                color={theme.colors.button.primary}
                onPress={handleExportLocal}
                disabled={busy}
              />
              {exportProgress && (
                <View style={{ marginTop: 8 }}>
                  <Text style={{ color: theme.colors.text.secondary, fontSize: 12 }}>
                    {exportProgress.phase}: {exportProgress.current}/{exportProgress.total}
                  </Text>
                  <View style={{ marginTop: 4, height: 4, backgroundColor: theme.colors.background.surface, borderRadius: 2, overflow: 'hidden' }}>
                    <View style={{ height: '100%', width: `${(exportProgress.current / exportProgress.total) * 100}%`, backgroundColor: theme.colors.button.primary }} />
                  </View>
                </View>
              )}
            </View>
            <View style={{ marginBottom: 12 }}>
              <Button
                title={isImporting ? 'Restoring...' : 'Restore from File'}
                color={theme.colors.button.delete}
                onPress={handleImportLocal}
                disabled={busy}
              />
              {importProgress && (
                <View style={{ marginTop: 8 }}>
                  <Text style={{ color: theme.colors.text.secondary, fontSize: 12 }}>
                    {importProgress.phase}: {importProgress.current}/{importProgress.total}
                  </Text>
                  <View style={{ marginTop: 4, height: 4, backgroundColor: theme.colors.background.surface, borderRadius: 2, overflow: 'hidden' }}>
                    <View style={{ height: '100%', width: `${(importProgress.current / importProgress.total) * 100}%`, backgroundColor: theme.colors.button.delete }} />
                  </View>
                </View>
              )}
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

            <Text style={[styles.configSectionTitle, { marginTop: 16 }]}>Duplicate Songs</Text>
            <View style={{ marginBottom: 12 }}>
              <Button
                title="Review Duplicate Songs"
                color={theme.colors.button.primary}
                onPress={openDuplicateFinder}
                disabled={savedMusic.length < 2}
              />
              {savedMusic.length < 2 && (
                <Text style={{ color: theme.colors.text.secondary, fontSize: 12, marginTop: 4 }}>
                  You need at least two saved songs to review duplicates.
                </Text>
              )}
            </View>

            {/* Duplicate Finder */}
            {showDuplicateFinder && (
              <Modal visible transparent animationType="slide" onRequestClose={() => setShowDuplicateFinder(false)}>
                <View style={styles.modalOverlay}>
                  <View style={styles.modalContent}>
                    <Text style={styles.configSectionTitle}>Duplicate Songs</Text>
                    <Text style={{ color: theme.colors.text.secondary, marginBottom: 12 }}>
                      Pick a likely duplicate group, then choose the specific saved song you want to replace with a correct TIDAL version.
                    </Text>
                    <ScrollView style={{ width: '100%', maxHeight: 320 }}>
                      {duplicateGroups.length === 0 ? (
                        <Text style={{ color: theme.colors.text.secondary, textAlign: 'center', marginVertical: 16 }}>
                          No likely duplicates found in your library.
                        </Text>
                      ) : (
                        duplicateGroups.map(group => (
                          <View key={group.key} style={{ marginBottom: 12, padding: 12, backgroundColor: theme.colors.background.surface, borderRadius: 8, width: '100%', alignSelf: 'stretch' }}>
                            <Text style={{ color: theme.colors.text.primary, fontWeight: "700" }}>
                              {group.title}
                            </Text>
                            <Text style={{ color: theme.colors.text.secondary, fontSize: 12, marginBottom: 8 }}>
                              {group.artist} · {group.tracks.length} versions
                            </Text>
                            {group.tracks.map(track => (
                              <TouchableOpacity
                                key={track.firebaseId || track.id}
                                onPress={() => openDuplicateTarget(track)}
                                style={{ paddingVertical: 10, paddingHorizontal: 10, backgroundColor: '#222', borderRadius: 6, marginBottom: 6, width: '100%', alignSelf: 'stretch' }}
                              >
                                <Text style={{ color: theme.colors.text.primary, fontWeight: "600", flexWrap: "wrap" }}>
                                  {track.title}
                                </Text>
                                <Text style={{ color: theme.colors.text.secondary, fontSize: 11, flexWrap: "wrap" }}>
                                  TIDAL ID: {track.id} · Rating: {track.rating} · Album: {track.album}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        ))
                      )}
                    </ScrollView>
                    <TouchableOpacity onPress={() => setShowDuplicateFinder(false)} style={styles.closeButton}>
                      <Text style={styles.closeButtonText}>Close</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Modal>
            )}

            {/* Duplicate Target Search */}
            {duplicateTarget && (
              <Modal visible transparent animationType="slide" onRequestClose={() => setDuplicateTarget(null)}>
                <View style={styles.modalOverlay}>
                  <View style={styles.modalContent}>
                    <Text style={styles.configSectionTitle}>Replace Song Version</Text>
                    <Text style={{ color: theme.colors.text.secondary, marginBottom: 12 }}>
                      Replace {duplicateTarget.title} by {duplicateTarget.artist}. Search TIDAL or paste an exact track ID.
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
                        placeholder='Search TIDAL... or exact track ID'
                        placeholderTextColor={theme.colors.text.muted}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        onSubmitEditing={submitSearch}
                        returnKeyType="search"
                        autoCorrect={false}
                        autoCapitalize="none"
                      />
                    </View>
                    {searchLoading ? (
                      <ActivityIndicator size="small" color={theme.colors.button.primary} />
                    ) : (
                      <FlatList
                        data={searchResults}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => (
                          <View style={{ marginBottom: 10 }}>
                            <MusicItem
                              music={item}
                              onPress={approveSelectedTrack}
                            />
                          </View>
                        )}
                        ListEmptyComponent={() => (
                          <Text style={{ color: theme.colors.text.secondary, textAlign: 'center', marginVertical: 16 }}>
                            No matches yet. Try a different title, artist, album, or exact TIDAL ID.
                          </Text>
                        )}
                        style={{ width: '100%', maxHeight: 420 }}
                      />
                    )}
                    <TouchableOpacity onPress={() => setDuplicateTarget(null)} style={styles.closeButton}>
                      <Text style={styles.closeButtonText}>Close</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Modal>
            )}

            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}
