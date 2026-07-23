import React from 'react';
import { Modal, View, Text, TouchableOpacity, ActivityIndicator, FlatList, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { theme } from '../styles/theme';
import { profileScreenStyles as styles } from './styles/ProfileScreen.styles';
import {
  disconnectTidalAccount,
  getTidalAccountData,
  finalizeTidalAuthorization,
  refreshTidalConnectionIfNeeded,
  subscribeToTidalAccountChanges,
  TidalAccountData,
  TidalPlaylistSummary,
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
  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    { ...getTidalAuthRequestConfig(), shouldAutoExchangeCode: false },
    getTidalAuthDiscovery()
  );

  React.useEffect(() => {
    if (!visible) return;
    let unsub = subscribeToTidalAccountChanges(setAccount);
    setLoading(true);
    refreshTidalConnectionIfNeeded().then(setAccount).catch(async () => {
      setAccount(await getTidalAccountData());
    }).finally(() => setLoading(false));
    return () => { unsub(); };
  }, [visible]);

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

  const renderPlaylist = ({ item }: { item: TidalPlaylistSummary }) => (
    <View style={{
      width: '100%',
      padding: 12,
      backgroundColor: theme.colors.background.surface,
      borderRadius: 8,
      marginBottom: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    }}>
      <View style={{
        width: 48,
        height: 48,
        borderRadius: 8,
        backgroundColor: '#111',
        justifyContent: 'center',
        alignItems: 'center',
      }}>
        <Ionicons name="musical-notes-outline" size={22} color={theme.colors.text.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: theme.colors.text.primary, fontWeight: '700' }} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={{ color: theme.colors.text.secondary, fontSize: 12 }} numberOfLines={1}>
          {item.numberOfTracks ? `${item.numberOfTracks} tracks` : 'TIDAL playlist'}
          {item.ownerName ? ` - ${item.ownerName}` : ''}
        </Text>
      </View>
    </View>
  );

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

              {loading ? (
                <ActivityIndicator color={theme.colors.button.primary} />
              ) : (
                <FlatList
                  data={account.playlists || []}
                  renderItem={renderPlaylist}
                  keyExtractor={(item) => item.id}
                  style={{ width: '100%', maxHeight: 420 }}
                  ListEmptyComponent={() => (
                    <Text style={{ color: theme.colors.text.secondary, textAlign: 'center', marginVertical: 16 }}>
                      No playlists were found for this account.
                    </Text>
                  )}
                />
              )}

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
