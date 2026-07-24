import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TextInput, Button, TouchableOpacity } from 'react-native';
import StarRating from 'react-native-star-rating-widget';
import { importPlaylistModalStyles as styles } from './styles/ImportPlaylistModal.styles';
import { MusicItem } from '../components/MusicItem';
import { MusicTrack, SavedMusic } from '../types';
import { FlashList } from '@shopify/flash-list';
import { DeezerDataEnricher } from '../services/deezer/deezerDataEnricher';
import { getSpotifyAccessToken } from '../services/spotify/spotifyApiClient';
import { getTidalTracksByIds } from '../services/tidal/tidalApiClient';
import { refreshTidalConnectionIfNeeded, getTidalAccountData, fetchTidalPlaylistItems } from '../services/tidal/tidalAccountService';
import { saveMusicBatch } from '../services/music/musicService';
import { useMusicStore } from '../store/musicStore';

type ImportService = 'spotify' | 'deezer' | 'tidal';

interface ImportPlaylistModalProps {
  visible: boolean;
  onCancel: () => void;
  onImport: () => void;
}

export function ImportPlaylistModal({ visible, onCancel, onImport }: ImportPlaylistModalProps) {
  const [service, setService] = useState<ImportService>('tidal');
  const [playlistLink, setPlaylistLink] = useState('');
  const [importRating, setImportRating] = useState(0);
  const [previewTracks, setPreviewTracks] = useState<MusicTrack[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [tidalConnected, setTidalConnected] = useState(false);
  const [tidalChecking, setTidalChecking] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setPlaylistLink('');
    setImportRating(0);
    setPreviewTracks([]);
    setPreviewError(null);
    setImportError(null);
    setImportLoading(false);
  }, [visible]);

  useEffect(() => {
    if (service !== 'tidal' || !visible) return;
    setTidalChecking(true);
    refreshTidalConnectionIfNeeded()
      .then(account => setTidalConnected(!!account.connected && !!account.tokenSet?.accessToken))
      .catch(() => setTidalConnected(false))
      .finally(() => setTidalChecking(false));
  }, [service, visible]);

  const extractTidalPlaylistId = (value: string) => {
    const trimmed = value.trim();
    const match = trimmed.match(/tidal\.com\/playlist\/([a-zA-Z0-9-]+)/i);
    if (match) return match[1];
    if (/^[a-zA-Z0-9-]+$/.test(trimmed)) return trimmed;
    return '';
  };

  const handlePreview = async () => {
    setPreviewLoading(true);
    setPreviewError(null);
    setPreviewTracks([]);
    try {
      if (service === 'spotify') {
        const spotifyMatch = playlistLink.match(/(playlist\/|open\.spotify\.com\/playlist\/)([a-zA-Z0-9]+)/);
        const playlistId = spotifyMatch?.[2] || (/^[a-zA-Z0-9]{22}$/.test(playlistLink.trim()) ? playlistLink.trim() : '');
        if (!playlistId) {
          setPreviewError('Please enter a valid Spotify playlist link or ID');
          setPreviewLoading(false);
          return;
        }

        const token = await getSpotifyAccessToken();
        let allTracks: any[] = [];
        let offset = 0;
        const limit = 100;
        let hasMore = true;

        while (hasMore) {
          const response = await fetch(
            `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=${limit}&offset=${offset}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          const playlistData = await response.json();
          const items = (playlistData.items || []).map((item: any) => item.track).filter((track: any) => track && track.id);
          allTracks = allTracks.concat(items);
          offset += limit;
          hasMore = !!playlistData.next;
        }

        setPreviewTracks(
          allTracks.map((track: any) => ({
            id: track.id,
            title: track.name,
            title_short: track.name,
            artist: { id: track.artists[0]?.id || '', name: track.artists[0]?.name || '', picture: '', picture_small: '', picture_medium: '' },
            album: { id: track.album?.id || '', title: track.album?.name || '', cover: track.album?.images?.[0]?.url || '', cover_small: track.album?.images?.[2]?.url || '', cover_medium: track.album?.images?.[1]?.url || '', cover_big: track.album?.images?.[0]?.url || '', release_date: track.album?.release_date || '' },
            duration: Math.floor(track.duration_ms / 1000),
            rank: 0,
            track_position: track.track_number,
            disk_number: track.disc_number,
            release_date: track.album?.release_date || '',
          }))
        );
        return;
      }

      if (service === 'tidal') {
        const tidalPlaylistId = extractTidalPlaylistId(playlistLink);
        if (!tidalPlaylistId) {
          setPreviewError('Please enter a valid TIDAL playlist link or ID');
          setPreviewLoading(false);
          return;
        }
        if (!tidalConnected) {
          setPreviewError('Please connect your TIDAL account first.');
          setPreviewLoading(false);
          return;
        }
        console.log('[ImportPlaylistModal] TIDAL preview starting, playlistId:', tidalPlaylistId);
        const account = await refreshTidalConnectionIfNeeded(undefined, { skipPlaylistRefresh: true });
        console.log('[ImportPlaylistModal] TIDAL account refreshed, connected:', account.connected, 'hasToken:', !!account.tokenSet?.accessToken);
        if (!account.connected || !account.tokenSet?.accessToken) {
          setPreviewError('Please connect your TIDAL account first.');
          setPreviewLoading(false);
          return;
        }
        const token = account.tokenSet.accessToken;
        console.log('[ImportPlaylistModal] Fetching TIDAL playlist items...');
        const items = await fetchTidalPlaylistItems(tidalPlaylistId, token);
        const trackIds = items.map(item => String(item.id || '')).filter(Boolean);
        console.log('[ImportPlaylistModal] Found', trackIds.length, 'track IDs, resolving...');
        if (trackIds.length === 0) {
          setPreviewTracks([]);
          return;
        }
        const tracks = await getTidalTracksByIds(trackIds, token);
        console.log('[ImportPlaylistModal] TIDAL tracks resolved:', tracks.length);
        setPreviewTracks(tracks);
        return;
      }

      const deezerMatch = playlistLink.match(/playlist\/(\d+)/);
      const deezerId = deezerMatch?.[1] || (/^\d+$/.test(playlistLink.trim()) ? playlistLink.trim() : '');
      if (!deezerId) {
        setPreviewError('Please enter a valid Deezer playlist link or ID');
        setPreviewLoading(false);
        return;
      }
      const response = await fetch(`https://api.deezer.com/playlist/${deezerId}`);
      const playlistData = await response.json();
      if (!playlistData.tracks || !playlistData.tracks.data) throw new Error('No tracks found in playlist');
      const enrichedTracks = await DeezerDataEnricher.enrichTracksWithAlbumData(playlistData.tracks.data);
      setPreviewTracks(
        enrichedTracks.map((track: any) => ({
          id: track.id,
          title: track.title,
          title_short: track.title,
          artist: { id: track.artist?.id || '', name: track.artist?.name || '', picture: '', picture_small: '', picture_medium: '' },
          album: { id: track.album?.id || '', title: track.album?.title || '', cover: track.album?.cover || '', cover_small: track.album?.cover_small || '', cover_medium: track.album?.cover_medium || '', cover_big: track.album?.cover_big || '', release_date: track.album?.release_date || track.release_date || '' },
          duration: track.duration,
          rank: track.rank || 0,
          track_position: track.track_position || 0,
          disk_number: track.disk_number || 1,
          release_date: track.album?.release_date || track.release_date || '',
        }))
      );
    } catch (err: any) {
      console.error('[ImportPlaylistModal] Preview failed:', err);
      setPreviewError(err.message || 'Failed to preview playlist');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleImport = async () => {
    if (previewTracks.length === 0) return;
    setImportLoading(true);
    setImportError(null);
    try {
      const existingIds = new Set(useMusicStore.getState().savedMusic.map(m => m.id));
      const newTracks = previewTracks.filter(track => !existingIds.has(track.id));

      if (newTracks.length === 0) {
        setImportError('All tracks are already in your library.');
        setImportLoading(false);
        return;
      }

      const firebaseIds = await saveMusicBatch(newTracks, importRating, [], true);

      const now = new Date();
      const savedMusics = newTracks.map((track, idx) => ({
        id: track.id,
        title: track.title,
        artist: track.artist.name,
        artistId: track.artist.id,
        album: track.album.title,
        albumId: track.album.id,
        coverUrl: track.album.cover || track.album.cover_medium || track.album.cover_small || '',
        duration: track.duration,
        rating: importRating,
        releaseDate: track.album.release_date || '1900-01-01',
        trackPosition: track.track_position || idx + 1,
        diskNumber: track.disk_number || 1,
        savedAt: now,
        firebaseId: firebaseIds[idx],
        tags: [],
        ratingHistory: importRating > 0 ? [{ rating: importRating, timestamp: now.toISOString() }] : [],
      })).filter((_, idx) => firebaseIds[idx]);

      useMusicStore.getState().addMusicBatch(savedMusics);

      const skippedCount = previewTracks.length - newTracks.length;
      console.log(`[ImportPlaylistModal] Imported ${savedMusics.length} tracks (skipped ${skippedCount} already in library)`);

      onImport();
    } catch (err: any) {
      console.error('[ImportPlaylistModal] Import failed:', err);
      setImportError(err.message || 'Failed to import playlist');
    } finally {
      setImportLoading(false);
    }
  };

  const canImport = previewTracks.length > 0 && !importLoading && !previewLoading;
  const canPreview = !previewLoading && !!playlistLink && (service !== 'tidal' || tidalConnected);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Import Playlist</Text>

          <View style={styles.serviceSelector}>
            {(['tidal', 'spotify', 'deezer'] as ImportService[]).map(s => (
              <TouchableOpacity
                key={s}
                onPress={() => { setService(s); setPreviewTracks([]); setPreviewError(null); setImportError(null); }}
                style={[styles.serviceTab, service === s && styles.serviceTabActive]}
              >
                <Text style={[styles.serviceTabText, service === s && styles.serviceTabTextActive]}>
                  {s === 'tidal' ? 'TIDAL' : s === 'spotify' ? 'Spotify' : 'Deezer'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {service === 'tidal' && (
            <View style={{ marginBottom: 12, alignItems: 'center' }}>
              {tidalChecking ? (
                <Text style={styles.tidalStatus}>Checking TIDAL connection...</Text>
              ) : tidalConnected ? (
                <Text style={styles.tidalStatus}>TIDAL connected</Text>
              ) : (
                <Text style={[styles.tidalStatus, { color: '#ff6b6b' }]}>Please connect your TIDAL account in Profile first.</Text>
              )}
            </View>
          )}

          <View style={styles.ratingContainer}>
            <Text style={styles.ratingLabel}>Select the rating for the imported songs:</Text>
            <Text style={styles.ratingValue}>
              {importRating === 0 ? 'N/A' : `${importRating}/10`}
            </Text>
            <StarRating
              rating={importRating}
              onChange={setImportRating}
              maxStars={10}
              starSize={32}
              color="#FFD700"
              emptyColor="#424242ff"
              enableHalfStar={true}
              starStyle={{ marginHorizontal: 0 }}
            />
          </View>

          <View style={{ position: 'relative' }}>
            <TextInput
              style={styles.modalInput}
              placeholder={
                service === 'tidal' ? 'Paste TIDAL playlist link or ID' :
                service === 'spotify' ? 'Paste Spotify playlist link or ID' :
                'Paste Deezer playlist link or ID'
              }
              placeholderTextColor="#888"
              value={playlistLink}
              onChangeText={setPlaylistLink}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {playlistLink.length > 0 && (
              <TouchableOpacity
                onPress={() => setPlaylistLink('')}
                style={{ position: 'absolute', right: 8, top: 6, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 }}
                accessibilityLabel="Clear playlist link"
              >
                <Text style={{ fontSize: 18, color: '#888' }}>&#x2715;</Text>
              </TouchableOpacity>
            )}
          </View>

          {previewLoading && (
            <Text style={styles.ratingLabel}>Loading playlist tracks...</Text>
          )}
          {previewError && <Text style={styles.errorText}>{previewError}</Text>}
          {previewTracks.length > 0 && (
            <View style={{ height: '55%', marginBottom: 8 }}>
              <Text style={styles.ratingLabel}>Preview: {previewTracks.length} track(s)</Text>
              <FlashList
                data={previewTracks}
                keyExtractor={track => track.id}
                estimatedItemSize={48}
                renderItem={({ item }) => (
                  <MusicItem
                    key={item.id}
                    music={{
                      id: item.id,
                      title: item.title,
                      artist: item.artist.name,
                      album: item.album?.title ?? '',
                      coverUrl: item.album?.cover_medium ?? item.album?.cover ?? '',
                      duration: item.duration ?? 0,
                      releaseDate: item.album?.release_date ?? '',
                      rating: importRating,
                      savedAt: new Date(),
                    } as SavedMusic}
                    onPress={() => {}}
                  />
                )}
                contentContainerStyle={{ paddingBottom: 8 }}
                showsVerticalScrollIndicator={true}
              />
            </View>
          )}
          {importError && <Text style={styles.errorText}>{importError}</Text>}
          <View style={styles.modalButtonRow}>
            <Button title="Cancel" onPress={onCancel} color="#444444" />
            <Button
              title={previewLoading ? "Loading..." : "Preview"}
              onPress={handlePreview}
              disabled={!canPreview}
              color="#007AFF"
            />
            <Button
              title={importLoading ? "Importing..." : "Import"}
              onPress={handleImport}
              disabled={!canImport}
              color="#003f82ff"
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}
