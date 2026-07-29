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
  importFromConfiguredPlaylists,
} from '../services/tidal/tidalAccountService';
import { useMusicStore } from '../store/musicStore';
import { saveMusicBatch } from '../services/music/musicService';
import { NeonButton } from '../components/NeonButton';

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
  const [importing, setImporting] = React.useState(false);
  const [importStatus, setImportStatus] = React.useState('');
  const [activeRating, setActiveRating] = React.useState<string | null>(null);
  const [ratingInputs, setRatingInputs] = React.useState<Record<string, string>>({});
  const preservedRatingPlaylists = React.useRef<Record<string, string> | null>(null);
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
      const results = await importFromConfiguredPlaylists(existingIds);

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
      Alert.alert('Import complete', `Imported ${totalImported} track(s) from ${results.length} playlist(s).`);
    } catch (error) {
      setImportStatus('');
      Alert.alert('Import failed', error instanceof Error ? error.message : 'Unable to import from TIDAL playlists.');
    } finally {
      setImporting(false);
    }
  };

  React.useEffect(() => {
    if (!response) return;
    if (response.type !== 'success' || !response.params?.code) return;

    setConnecting(true);
    const savedPlaylists = preservedRatingPlaylists.current;
    finalizeTidalAuthorization(response.params.code, request?.codeVerifier)
      .then(async connected => {
        if (savedPlaylists && Object.keys(savedPlaylists).length > 0) {
          const merged = { ...savedPlaylists, ...connected.ratingPlaylists };
          const updated = await updateTidalRatingPlaylists(merged);
          setAccount(updated);
        } else {
          setAccount(connected);
        }
        Alert.alert('TIDAL connected', 'Your TIDAL account has been linked successfully.');
      })
      .catch(error => {
        Alert.alert('Connection failed', error instanceof Error ? error.message : 'Unable to connect your TIDAL account.');
      })
      .finally(() => {
        setConnecting(false);
        preservedRatingPlaylists.current = null;
      });
  }, [request?.codeVerifier, response]);

  const handleConnect = async () => {
    preservedRatingPlaylists.current = account?.ratingPlaylists || null;
    setConnecting(true);
    try {
      await promptAsync();
    } catch (error) {
      setConnecting(false);
      Alert.alert('Connection failed', error instanceof Error ? error.message : 'Unable to start TIDAL authorization.');
    }
  };

  const handleDisconnect = async () => {
    Alert.alert(
      'Disconnect TIDAL',
      'Are you sure you want to disconnect your TIDAL account? Your rating playlists configuration will be lost.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, disconnect',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Are you absolutely sure?',
              'This cannot be undone. You will need to reconnect and reconfigure everything.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Disconnect',
                  style: 'destructive',
                  onPress: async () => {
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
                  },
                },
              ]
            );
          },
        },
      ]
    );
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
              <NeonButton
                text="Save"
                onPress={() => saveRatingPlaylist(ratingKey, normalizePlaylistId(currentValue) || null)}
                disabled={savingMappings}
                color="#007AFF"
                icon="checkmark"
                fullWidth={false}
                compact
                style={{ paddingVertical: 8, paddingHorizontal: 10, flex: 1 }}
              />
              <NeonButton
                text="Clear"
                onPress={() => {
                  setRatingInputs(prev => ({ ...prev, [ratingKey]: '' }));
                  saveRatingPlaylist(ratingKey, null);
                }}
                disabled={savingMappings}
                color="#555"
                fullWidth={false}
                compact
                style={{ paddingVertical: 8, paddingHorizontal: 10, minWidth: 100 }}
              />
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
        <View style={[styles.modalContent, { paddingBottom: 0, overflow: 'hidden', maxHeight: '95%' }]}>          
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
                <NeonButton
                  text="Connect TIDAL"
                  onPress={handleConnect}
                  disabled={connecting}
                  loading={connecting}
                  color="#007AFF"
                  icon="log-in-outline"
                  fullWidth={false}
                  style={{ paddingVertical: 12, paddingHorizontal: 18, minWidth: 180 }}
                />
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

                <NeonButton
                  text="Import All from TIDAL Playlists"
                  onPress={handleImportAll}
                  disabled={importing}
                  loading={importing}
                  color="#4CD964"
                  icon="download-outline"
                  style={{ paddingVertical: 10, paddingHorizontal: 14, marginTop: 18 }}
                />
                {importStatus ? (
                  <Text style={{ color: theme.colors.text.secondary, fontSize: 11, textAlign: 'center', marginTop: 6, marginBottom: 2 }}>{importStatus}</Text>
                ) : null}

                <NeonButton
                  text="Re-authorize TIDAL"
                  onPress={handleConnect}
                  disabled={connecting}
                  loading={connecting}
                  color="#FF9500"
                  icon="refresh-outline"
                  fullWidth={false}
                  style={{ paddingVertical: 10, paddingHorizontal: 32, alignSelf: 'center', marginTop: 8 }}
                />

                <NeonButton
                  text="Disconnect TIDAL"
                  onPress={handleDisconnect}
                  disabled={disconnecting}
                  loading={disconnecting}
                  color="#FF453A"
                  icon="log-out-outline"
                  fullWidth={false}
                  style={{ paddingVertical: 10, paddingHorizontal: 32, alignSelf: 'center', marginTop: 8 }}
                />
              </>
            )}

            <NeonButton text="Close" onPress={onClose} color="#555" fullWidth={false} compact style={{ paddingVertical: 10, paddingHorizontal: 32, alignSelf: 'center', marginTop: 8 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
