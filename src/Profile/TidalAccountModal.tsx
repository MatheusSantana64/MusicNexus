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
} from '../services/tidal/tidalAccountService';

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
  const [activeRating, setActiveRating] = React.useState<string | null>(null);
  const [ratingInputs, setRatingInputs] = React.useState<Record<string, string>>({});
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
        <View style={[styles.modalContent, { width: '92%', maxHeight: '88%' }]}>
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
                  Connected as {account.displayName || 'TIDAL user'}
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
                <ScrollView style={{ width: '100%', maxHeight: 320 }}>
                  {ratingKeys.map(renderRatingSelector)}
                </ScrollView>
                {savingMappings && (
                  <View style={{ marginTop: 8 }}>
                    <ActivityIndicator color={theme.colors.button.primary} />
                  </View>
                )}
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
        </View>
      </View>
    </Modal>
  );
}
