import React from 'react';
import { Modal, View, Text, TouchableOpacity, ActivityIndicator, Alert, ScrollView, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { theme } from '../styles/theme';
import { profileScreenStyles as styles } from './styles/ProfileScreen.styles';
import {
  disconnectTidalAccount,
  getTidalAccountData,
  finalizeTidalAuthorization,
  getTidalRatingKeys,
  refreshTidalConnectionIfNeeded,
  updateTidalRatingPlaylists,
  subscribeToTidalAccountChanges,
  TidalAccountData,
  getTidalAuthDiscovery,
  getTidalAuthRequestConfig,
  reconcileTidalRatingPlaylists,
  removeTrackFromConfiguredPlaylist,
  addTrackToConfiguredPlaylist,
  TidalPlaylistSyncIssue,
  importFromConfiguredPlaylists,
} from '../services/tidal/tidalAccountService';
import { useMusicStore } from '../store/musicStore';
import { saveMusicBatch } from '../services/music/musicService';

interface TidalAccountModalProps {
  visible: boolean;
  onClose: () => void;
}

WebBrowser.maybeCompleteAuthSession();

export function TidalAccountModal({ visible, onClose }: TidalAccountModalProps) {
  const [account, setAccount] = React.useState<TidalAccountData | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [connecting, setConnecting] = React.useState(false);
  const [disconnecting, setDisconnecting] = React.useState(false);
  const [savingMappings, setSavingMappings] = React.useState(false);
  const [scanning, setScanning] = React.useState(false);
  const [importing, setImporting] = React.useState(false);
  const [importStatus, setImportStatus] = React.useState('');
  const [issues, setIssues] = React.useState<TidalPlaylistSyncIssue[]>([]);
  const [scanQueue, setScanQueue] = React.useState<string[]>([]);
  const [scannedPlaylists, setScannedPlaylists] = React.useState<string[]>([]);
  const [scanStatus, setScanStatus] = React.useState<string>('Idle');
  const [resolvingTrackIds, setResolvingTrackIds] = React.useState<Set<string>>(new Set());
  const [activeRating, setActiveRating] = React.useState<string | null>(null);
  const [ratingInputs, setRatingInputs] = React.useState<Record<string, string>>({});
  const savedMusic = useMusicStore(state => state.savedMusic);
  const connectedUsername = React.useMemo(() => {
    const value = account?.displayName?.trim();
    if (!value) return 'TIDAL user';
    if (value.includes('@')) return value.split('@')[0];
    return value;
  }, [account?.displayName]);
  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    { ...(getTidalAuthRequestConfig() as AuthSession.AuthRequestConfig), shouldAutoExchangeCode: false } as AuthSession.AuthRequestConfig,
    getTidalAuthDiscovery()
  );

  React.useEffect(() => {
    if (!visible) return;
    let unsub = subscribeToTidalAccountChanges(setAccount);
    setLoading(true);
    (async () => {
      try {
        setAccount(await refreshTidalConnectionIfNeeded());
      } catch {
        setAccount(await getTidalAccountData());
      } finally {
        setLoading(false);
      }
    })();
    return () => { unsub(); };
  }, [visible]);

  React.useEffect(() => {
    setRatingInputs(account?.ratingPlaylists || {});
  }, [account?.ratingPlaylists]);

  const runScan = async () => {
    setScanning(true);
    try {
      const playlistIds = Object.values(account?.ratingPlaylists || {});
      const nextPlaylistId = scanQueue[0] || playlistIds.find(id => !scannedPlaylists.includes(id));
      if (!nextPlaylistId) {
        Alert.alert('Nothing to scan', 'No configured TIDAL playlists were found.');
        return;
      }

      setScanStatus(`Scanning ${scannedPlaylists.length + 1} / ${playlistIds.length}`);
      const result = await reconcileTidalRatingPlaylists(savedMusic, nextPlaylistId);
      setIssues(prev => {
        const withoutCurrent = prev.filter(item => !result.issues.some(next => next.trackId === item.trackId));
        return [...withoutCurrent, ...result.issues];
      });
      setScannedPlaylists(prev => Array.from(new Set([...prev, ...result.scannedPlaylists])));
      setScanQueue(result.remainingPlaylists);
      setScanStatus(
        result.remainingPlaylists.length > 0
          ? `Scanned ${scannedPlaylists.length + 1} / ${playlistIds.length}. ${result.remainingPlaylists.length} playlist(s) remaining.`
          : `Scanned ${scannedPlaylists.length + 1} / ${playlistIds.length}. All configured playlists scanned.`
      );

      if (result.duplicateTracks.length > 0) {
        Alert.alert(
          'Duplicates found',
          `Found ${result.duplicateTracks.length} track(s) on multiple configured playlists. Review the list below to choose which version to keep.`
        );
      } else if (result.issues.length === 0) {
        Alert.alert('Checkpoint complete', `Scanned one playlist. ${result.remainingPlaylists.length} playlist(s) remain.`);
      }
    } catch (error) {
      Alert.alert('Scan failed', error instanceof Error ? error.message : 'Unable to reconcile TIDAL playlists.');
    } finally {
      setScanning(false);
    }
  };

  const handleImportAll = async () => {
    const playlistCount = Object.keys(account?.ratingPlaylists || {}).length;
    if (playlistCount === 0) {
      Alert.alert('No playlists configured', 'Please configure rating-to-playlist mappings first.');
      return;
    }

    setImporting(true);
    setImportStatus('Reading configured playlists...');
    try {
      const existingIds = new Set(useMusicStore.getState().savedMusic.map(m => m.id));
      const results = await importFromConfiguredPlaylists(existingIds, [5, 6]);

      let totalImported = 0;
      for (const { rating, tracks } of results) {
        setImportStatus(`Saving ${tracks.length} track(s) rated ${rating}...`);
        const firebaseIds = await saveMusicBatch(tracks, rating, [], true);
        const now = new Date();
        const savedMusics = tracks.map((track, idx) => ({
          id: track.id,
          title: track.title,
          artist: track.artist.name,
          artistId: track.artist.id,
          album: track.album.title,
          albumId: track.album.id,
          coverUrl: track.album.cover || track.album.cover_medium || track.album.cover_small || '',
          duration: track.duration,
          rating,
          releaseDate: track.album.release_date,
          trackPosition: track.track_position || idx + 1,
          diskNumber: track.disk_number || 1,
          savedAt: now,
          firebaseId: firebaseIds[idx],
          tags: [],
          ratingHistory: rating > 0 ? [{ rating, timestamp: now.toISOString() }] : [],
        })).filter((_, idx) => firebaseIds[idx]);

        useMusicStore.getState().addMusicBatch(savedMusics);
        totalImported += savedMusics.length;
      }

      setImportStatus('');
      console.log('[handleImportAll] === FINAL SUMMARY ===');
      console.log(`[handleImportAll] Playlists processed: ${results.length}`);
      console.log(`[handleImportAll] Total tracks resolved: ${results.reduce((s, r) => s + r.tracks.length, 0)}`);
      console.log(`[handleImportAll] Total saved to Firebase: ${totalImported}`);
      for (const { rating, tracks } of results) {
        console.log(`[handleImportAll] Rating ${rating}: ${tracks.length} tracks`);
        for (const t of tracks) {
          console.log(`[handleImportAll]   ${t.title} — ${t.artist.name} — cover:${t.album.cover ? 'yes' : 'NO'} — pos:${t.track_position ?? 'none'} — dur:${t.duration}`);
        }
      }

      Alert.alert('Import complete', `Imported ${totalImported} track(s) from ${results.length} playlist(s).`);
    } catch (error) {
      console.error('[handleImportAll] FAILED:', error);
      setImportStatus('');
      Alert.alert('Import failed', error instanceof Error ? error.message : 'Unable to import from TIDAL playlists.');
    } finally {
      setImporting(false);
    }
  };

  const resolveIssue = async (issue: TidalPlaylistSyncIssue, keep: 'library' | 'playlist', selectedPlaylistId?: string) => {
    const track = savedMusic.find(item => item.id === issue.trackId);
    if (!track) {
      Alert.alert('Missing track', 'That track is no longer in your library.');
      return;
    }

    setResolvingTrackIds(prev => new Set(prev).add(issue.trackId));
    try {
      if (keep === 'library') {
        const keepRatingPlaylistId = account?.ratingPlaylists?.[Number(track.rating).toFixed(1)];
        for (const playlistId of issue.playlistIds) {
          await removeTrackFromConfiguredPlaylist(playlistId, issue.trackId);
        }
        if (keepRatingPlaylistId && Number(track.rating) > 0) {
          await addTrackToConfiguredPlaylist(keepRatingPlaylistId, issue.trackId);
        }
        setIssues(prev => prev.filter(item => item.trackId !== issue.trackId));
        Alert.alert('Resolved', 'Kept the library rating and updated TIDAL playlists.');
        return;
      }

      if (!selectedPlaylistId) {
        Alert.alert('Missing selection', 'Please choose which TIDAL playlist to keep.');
        return;
      }

      for (const playlistId of issue.playlistIds) {
        if (playlistId !== selectedPlaylistId) {
          await removeTrackFromConfiguredPlaylist(playlistId, issue.trackId);
        }
      }

      const selectedRating = Number(
        Object.entries(account?.ratingPlaylists || {}).find(([, id]) => id === selectedPlaylistId)?.[0] || track.rating
      );
      if (track.firebaseId) {
        await useMusicStore.getState().updateRating(track.firebaseId, selectedRating);
      }
      await addTrackToConfiguredPlaylist(selectedPlaylistId, issue.trackId);

      setIssues(prev => prev.filter(item => item.trackId !== issue.trackId));
      Alert.alert('Resolved', 'Kept the selected playlist version.');
    } catch (error) {
      Alert.alert('Resolution failed', error instanceof Error ? error.message : 'Unable to apply this resolution.');
    } finally {
      setResolvingTrackIds(prev => {
        const next = new Set(prev);
        next.delete(issue.trackId);
        return next;
      });
    }
  };

  React.useEffect(() => {
    if (!response) return;
    if (response.type !== 'success' || !response.params?.code) return;

    setConnecting(true);
    finalizeTidalAuthorization(response.params.code, request?.codeVerifier)
      .then(connected => {
        setAccount(connected);
        Alert.alert('TIDAL connected', 'Your TIDAL account has been linked successfully.');
      })
      .catch(error => {
        Alert.alert('Connection failed', error instanceof Error ? error.message : 'Unable to connect your TIDAL account.');
      })
      .finally(() => setConnecting(false));
  }, [request?.codeVerifier, response]);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      await promptAsync();
    } catch (error) {
      setConnecting(false);
      Alert.alert('Connection failed', error instanceof Error ? error.message : 'Unable to start TIDAL authorization.');
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await disconnectTidalAccount();
      setAccount({ connected: false });
      Alert.alert('Disconnected', 'Your TIDAL account has been disconnected.');
    } catch (error) {
      Alert.alert('Disconnect failed', error instanceof Error ? error.message : 'Unable to disconnect TIDAL.');
    } finally {
      setDisconnecting(false);
    }
  };

  const ratingKeys = getTidalRatingKeys();
  const activePlaylistIds = account?.ratingPlaylists || {};

  const saveRatingPlaylist = async (ratingKey: string, playlistId: string | null) => {
    setSavingMappings(true);
    try {
      const updatedMappings = {
        ...(account?.ratingPlaylists || {}),
      };

      if (playlistId) {
        updatedMappings[ratingKey] = playlistId;
      } else {
        delete updatedMappings[ratingKey];
      }

      const updated = await updateTidalRatingPlaylists(updatedMappings);
      setAccount(updated);
      setActiveRating(null);
    } catch (error) {
      Alert.alert('Save failed', error instanceof Error ? error.message : 'Unable to save rating mappings.');
    } finally {
      setSavingMappings(false);
    }
  };

  const normalizePlaylistId = (value: string) => value.trim().replace(/^https?:\/\/tidal\.com\/playlist\//i, '').replace(/\/.*$/, '');

  const renderRatingSelector = (ratingKey: string) => {
    const selectedPlaylistId = activePlaylistIds[ratingKey] || null;
    const currentValue = ratingInputs[ratingKey] ?? selectedPlaylistId ?? '';

    return (
      <View
        key={ratingKey}
        style={{
          width: '100%',
          marginBottom: 10,
          padding: 12,
          backgroundColor: theme.colors.background.surface,
          borderRadius: 8,
        }}
      >
        <TouchableOpacity
          onPress={() => setActiveRating(activeRating === ratingKey ? null : ratingKey)}
          disabled={savingMappings}
          style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <Text style={{ color: theme.colors.text.primary, fontWeight: '700' }}>
            {ratingKey}
          </Text>
          <Text style={{ color: selectedPlaylistId ? theme.colors.text.primary : theme.colors.text.secondary, flex: 1, textAlign: 'right' }} numberOfLines={1}>
            {selectedPlaylistId ? selectedPlaylistId : 'Not configured'}
          </Text>
        </TouchableOpacity>

        {activeRating === ratingKey && (
          <View style={{ marginTop: 10 }}>
            <Text style={{ color: theme.colors.text.secondary, fontSize: 12, marginBottom: 8 }}>
              Paste the TIDAL playlist ID or full playlist link for this rating.
            </Text>
            <TextInput
              value={currentValue}
              onChangeText={(value) => setRatingInputs(prev => ({ ...prev, [ratingKey]: value }))}
              placeholder="4f0f3200-64eb-46f4-97ce-c78b7c6d3e1e"
              placeholderTextColor={theme.colors.text.secondary}
              autoCapitalize="none"
              autoCorrect={false}
              style={{
                color: theme.colors.text.primary,
                backgroundColor: '#222',
                borderRadius: 6,
                paddingHorizontal: 12,
                paddingVertical: 10,
                marginBottom: 8,
              }}
            />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                onPress={() => saveRatingPlaylist(ratingKey, normalizePlaylistId(currentValue) || null)}
                disabled={savingMappings}
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  paddingHorizontal: 10,
                  borderRadius: 6,
                  backgroundColor: theme.colors.button.primary,
                }}
              >
                <Text style={{ color: theme.colors.text.primary, textAlign: 'center', fontWeight: '700' }}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity
              onPress={() => {
                setRatingInputs(prev => ({ ...prev, [ratingKey]: '' }));
                saveRatingPlaylist(ratingKey, null);
              }}
                disabled={savingMappings}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 10,
                  borderRadius: 6,
                  backgroundColor: '#222',
                  minWidth: 100,
                }}
              >
                <Text style={{ color: theme.colors.text.primary, textAlign: 'center' }}>Clear</Text>
              </TouchableOpacity>
            </View>
            <Text style={{ color: theme.colors.text.secondary, fontSize: 11, marginTop: 8 }}>
              Example: {`https://tidal.com/playlist/4f0f3200-64eb-46f4-97ce-c78b7c6d3e1e`}
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { width: '92%', maxHeight: '88%', paddingBottom: 0, overflow: 'hidden' }]}>
          <ScrollView
            style={{ width: '100%' }}
            contentContainerStyle={{ paddingBottom: 18 }}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 12 }}>
              <Text style={styles.configSectionTitle}>Account</Text>
              <Ionicons name="person-circle-outline" size={28} color={theme.colors.text.primary} />
            </View>

            {!account?.connected ? (
              <View style={{ width: '100%', alignItems: 'center' }}>
                <Text style={{ color: theme.colors.text.secondary, textAlign: 'center', marginBottom: 16 }}>
                  Connect your TIDAL account to load your playlists and prepare playlist synchronization.
                </Text>
                <TouchableOpacity
                  onPress={handleConnect}
                  disabled={connecting}
                  style={{
                    backgroundColor: theme.colors.button.primary,
                    paddingVertical: 12,
                    paddingHorizontal: 18,
                    borderRadius: 10,
                    minWidth: 180,
                    alignItems: 'center',
                  }}
                >
                  {connecting ? (
                    <ActivityIndicator color={theme.colors.text.primary} />
                  ) : (
                    <Text style={{ color: theme.colors.text.primary, fontWeight: '700' }}>Connect TIDAL</Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={{ width: '100%', marginBottom: 12 }}>
                  <Text style={{ color: theme.colors.text.primary, fontWeight: '700' }}>
                    Connected as {connectedUsername}
                  </Text>
                  <Text style={{ color: theme.colors.text.secondary, fontSize: 12, marginTop: 4 }}>
                    Playlists last synced: {account.lastSyncedAt ? new Date(account.lastSyncedAt).toLocaleString() : 'unknown'}
                  </Text>
                </View>

                <View style={{ width: '100%', marginTop: 16 }}>
                  <Text style={{ color: theme.colors.text.primary, fontWeight: '700', marginBottom: 8 }}>
                    Rating to playlist
                  </Text>
                  <Text style={{ color: theme.colors.text.secondary, fontSize: 12, marginBottom: 12 }}>
                    Paste the TIDAL playlist ID or full playlist link for each rating. Leave any rating empty to keep the current behavior.
                  </Text>
                  <ScrollView
                    style={{ width: '100%', maxHeight: 320 }}
                    contentContainerStyle={{ paddingBottom: 4 }}
                    nestedScrollEnabled
                    showsVerticalScrollIndicator={true}
                  >
                    {ratingKeys.map(renderRatingSelector)}
                  </ScrollView>
                  {savingMappings && (
                    <View style={{ marginTop: 8 }}>
                      <ActivityIndicator color={theme.colors.button.primary} />
                    </View>
                  )}
                </View>

                <View style={{ width: '100%', marginTop: 18 }}>
                  <TouchableOpacity
                    onPress={handleImportAll}
                    disabled={importing || scanning}
                    style={{
                      backgroundColor: '#1a5c2a',
                      paddingVertical: 10,
                      paddingHorizontal: 14,
                      borderRadius: 8,
                      alignItems: 'center',
                      marginBottom: 8,
                    }}
                  >
                    {importing ? (
                      <ActivityIndicator color={theme.colors.text.primary} />
                    ) : (
                      <Text style={{ color: theme.colors.text.primary, fontWeight: '700' }}>Import All from TIDAL Playlists</Text>
                    )}
                  </TouchableOpacity>
                  {importStatus ? (
                    <Text style={{ color: theme.colors.text.secondary, fontSize: 11, marginBottom: 8 }}>{importStatus}</Text>
                  ) : (
                    <Text style={{ color: theme.colors.text.secondary, fontSize: 11, marginBottom: 8 }}>
                      Import all songs from your configured rating playlists into the app.
                    </Text>
                  )}
                </View>

                <View style={{ width: '100%', marginTop: 18 }}>
                  <Text style={{ color: theme.colors.text.primary, fontWeight: '700', marginBottom: 8 }}>
                    Sync review
                  </Text>
                  <Text style={{ color: theme.colors.text.secondary, fontSize: 12, marginBottom: 10 }}>
                    Compare your library ratings with the configured TIDAL playlists and resolve conflicts manually.
                  </Text>
                  <TouchableOpacity
                    onPress={runScan}
                    disabled={scanning}
                    style={{
                      backgroundColor: theme.colors.button.primary,
                      paddingVertical: 10,
                      paddingHorizontal: 14,
                      borderRadius: 8,
                      alignItems: 'center',
                      marginBottom: 12,
                    }}
                  >
                    {scanning ? (
                      <ActivityIndicator color={theme.colors.text.primary} />
                    ) : (
                      <Text style={{ color: theme.colors.text.primary, fontWeight: '700' }}>Scan TIDAL sync</Text>
                    )}
                  </TouchableOpacity>
                  <Text style={{ color: theme.colors.text.secondary, fontSize: 11, marginBottom: 8 }}>
                    {scanStatus}
                  </Text>

                  <ScrollView
                    style={{ width: '100%', maxHeight: 260 }}
                    contentContainerStyle={{ paddingBottom: 4 }}
                    nestedScrollEnabled
                    showsVerticalScrollIndicator={true}
                  >
                    {issues.length === 0 ? (
                      <Text style={{ color: theme.colors.text.secondary, fontSize: 12 }}>No unresolved conflicts yet.</Text>
                    ) : (
                      issues.map(issue => {
                        const busy = resolvingTrackIds.has(issue.trackId);
                        const isDuplicate = issue.conflictType === 'duplicate';
                        const libraryAt = issue.libraryTimestamp ? Date.parse(issue.libraryTimestamp) : 0;
                        const newestPlaylistAt = Math.max(...(issue.playlistDetails || []).map(detail => Date.parse(detail.addedAt || '')).filter(Number.isFinite), 0);
                        const newestSource = libraryAt >= newestPlaylistAt ? 'library' : 'playlist';
                        return (
                          <View key={issue.trackId + '-' + issue.conflictType} style={{ marginBottom: 10, padding: 12, backgroundColor: theme.colors.background.surface, borderRadius: 8, width: '100%' }}>
                            <Text style={{ color: theme.colors.text.primary, fontWeight: '700' }} numberOfLines={2}>
                              {issue.trackTitle || issue.trackId}
                            </Text>
                            <Text style={{ color: theme.colors.text.secondary, fontSize: 12, marginTop: 4 }} numberOfLines={2}>
                              {issue.artist || 'Unknown artist'} � library {issue.libraryRating ?? 'n/a'} � playlists {issue.playlistRatings.join(', ')}
                            </Text>
                            <View style={{ marginTop: 8, gap: 6 }}>
                              <Text style={{ color: newestSource === 'library' ? theme.colors.button.primary : theme.colors.text.secondary, fontSize: 11, fontWeight: newestSource === 'library' ? '700' : '400' }}>
                                Library latest: {issue.libraryTimestamp || 'unknown'}
                              </Text>
                              {(issue.playlistDetails || []).map(detail => {
                                const addedAt = detail.addedAt ? Date.parse(detail.addedAt) : 0;
                                const highlighted = addedAt === newestPlaylistAt && newestSource === 'playlist';
                                return (
                                  <Text
                                    key={detail.playlistId}
                                    style={{
                                      color: highlighted ? theme.colors.button.primary : theme.colors.text.secondary,
                                      fontSize: 11,
                                      fontWeight: highlighted ? '700' : '400',
                                    }}
                                  >
                                    Playlist {detail.rating} added: {detail.addedAt || 'unknown'}
                                  </Text>
                                );
                              })}
                            </View>
                            <Text style={{ color: theme.colors.text.secondary, fontSize: 11, marginTop: 4 }}>
                              {isDuplicate ? 'Song is on multiple playlists.' : 'Song is on a different rating playlist than your library rating.'}
                            </Text>
                            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                              <TouchableOpacity
                                onPress={() => resolveIssue(issue, 'library')}
                                disabled={busy}
                                style={{ backgroundColor: '#2b2b2b', paddingVertical: 8, paddingHorizontal: 10, borderRadius: 6 }}
                              >
                                <Text style={{ color: theme.colors.text.primary, fontWeight: '700' }}>
                                  {busy ? 'Working...' : 'Keep library'}
                                </Text>
                              </TouchableOpacity>
                              {issue.playlistIds.map((playlistId, index) => (
                                <TouchableOpacity
                                  key={playlistId}
                                  onPress={() => resolveIssue(issue, 'playlist', playlistId)}
                                  disabled={busy}
                                  style={{ backgroundColor: theme.colors.button.primary, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 6 }}
                                >
                                  <Text style={{ color: theme.colors.text.primary, fontWeight: '700' }}>
                                    Keep playlist {issue.playlistRatings[index]}
                                  </Text>
                                </TouchableOpacity>
                              ))}
                            </View>
                          </View>
                        );
                      })
                    )}
                  </ScrollView>
                </View>
                <TouchableOpacity
                  onPress={handleDisconnect}
                  disabled={disconnecting}
                  style={[styles.closeButton, { backgroundColor: theme.colors.button.delete, marginTop: 12 }]}
                >
                  {disconnecting ? (
                    <ActivityIndicator color={theme.colors.text.primary} />
                  ) : (
                    <Text style={styles.closeButtonText}>Disconnect TIDAL</Text>
                  )}
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}


