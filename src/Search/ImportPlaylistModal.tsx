// src/Search/ImportPlaylistModal.tsx
// Modal for importing playlists from Deezer
import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TextInput, Button, TouchableOpacity } from 'react-native';
import StarRating from 'react-native-star-rating-widget';
import { importPlaylistModalStyles as styles } from './styles/ImportPlaylistModal.styles';
import { MusicItem } from '../components/MusicItem';
import { SavedMusic } from '../types/savedMusic';
import { FlashList } from '@shopify/flash-list';
import { DeezerDataEnricher } from '../services/deezer/deezerDataEnricher';
import { spotifyUnifiedSearch, getSpotifyAccessToken } from '../services/spotify/spotifyApiClient';

interface ImportPlaylistModalProps {
  visible: boolean;
  playlistLink: string;
  importRating: number;
  importLoading: boolean;
  importError: string | null;
  onChangeLink: (link: string) => void;
  onChangeRating: (rating: number) => void;
  onCancel: () => void;
  onImport: () => void;
}

export function ImportPlaylistModal({
  visible,
  playlistLink,
  importRating,
  importLoading,
  importError,
  onChangeLink,
  onChangeRating,
  onCancel,
  onImport,
}: ImportPlaylistModalProps) {
  const [previewTracks, setPreviewTracks] = useState<{
    id: string;
    title: string;
    artist: string;
    album?: string;
    coverUrl?: string;
    duration?: number;
    releaseDate?: string;
  }[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Clear preview when modal is closed
  useEffect(() => {
    if (!visible) {
      setPreviewTracks([]);
      setPreviewError(null);
      setPreviewLoading(false);
    }
  }, [visible]);

  const handlePreview = async () => {
    setPreviewLoading(true);
    setPreviewError(null);
    setPreviewTracks([]);
    try {
      let playlistId = '';
      let isSpotify = false;

      // Detect Spotify playlist link or ID
      const spotifyMatch = playlistLink.match(/(playlist\/|open\.spotify\.com\/playlist\/)([a-zA-Z0-9]+)/);
      if (spotifyMatch) {
        playlistId = spotifyMatch[2];
        isSpotify = true;
      } else if (/^[a-zA-Z0-9]{22}$/.test(playlistLink.trim())) {
        playlistId = playlistLink.trim();
        isSpotify = true;
      }

      if (isSpotify) {
        // Fetch ALL Spotify playlist tracks using pagination
        const token = await getSpotifyAccessToken();
        let allTracks: any[] = [];
        let offset = 0;
        const limit = 100; // Spotify API limit
        let hasMore = true;

        while (hasMore) {
          const response = await fetch(
            `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=${limit}&offset=${offset}`,
            { headers: { 'Authorization': `Bearer ${token}` } }
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
            artist: track.artists[0]?.name || '',
            album: track.album?.name || '',
            coverUrl: track.album?.images?.[1]?.url || track.album?.images?.[0]?.url || '',
            duration: Math.floor(track.duration_ms / 1000),
            releaseDate: track.album?.release_date || '',
          }))
        );
        setPreviewLoading(false);
        return;
      }

      // Fallback to Deezer logic
      const match = playlistLink.match(/playlist\/(\d+)/);
      if (match) {
        playlistId = match[1];
      } else if (/^\d+$/.test(playlistLink.trim())) {
        playlistId = playlistLink.trim();
      } else {
        setPreviewError('Please enter a valid Spotify or Deezer playlist link or ID');
        setPreviewLoading(false);
        return;
      }
      const response = await fetch(`https://api.deezer.com/playlist/${playlistId}`);
      const playlistData = await response.json();
      if (!playlistData.tracks || !playlistData.tracks.data) throw new Error('No tracks found in playlist');
      const tracks = playlistData.tracks.data;

      // Enrich tracks for accurate position and release date
      const enrichedTracks = await DeezerDataEnricher.enrichTracksWithAlbumData(tracks);

      setPreviewTracks(
        enrichedTracks.map((track: any) => ({
          id: track.id,
          title: track.title,
          artist: track.artist?.name || '',
          album: track.album?.title || '',
          coverUrl: track.album?.cover_medium || '',
          duration: track.duration,
          releaseDate: track.album?.release_date || track.release_date || '',
        }))
      );
    } catch (err: any) {
      setPreviewError(err.message || 'Failed to preview playlist');
    } finally {
      setPreviewLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Import Playlist from Spotify or Deezer</Text>
          <View style={styles.ratingContainer}>
            <Text style={styles.ratingLabel}>Select the rating for the imported songs:</Text>
            <Text style={styles.ratingValue}>
              {importRating === 0 ? 'N/A' : `${importRating}/10`}
            </Text>
            <StarRating
              rating={importRating}
              onChange={onChangeRating}
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
              placeholder="Paste Spotify or Deezer playlist link or ID"
              placeholderTextColor="#888"
              value={playlistLink}
              onChangeText={onChangeLink}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {playlistLink.length > 0 && (
              <TouchableOpacity
                onPress={() => onChangeLink('')}
                style={{
                  position: 'absolute',
                  right: 8,
                  top: 6,
                  justifyContent: 'center',
                  alignItems: 'center',
                  paddingHorizontal: 4,
                }}
                accessibilityLabel="Clear playlist link"
              >
                <Text style={{ fontSize: 18, color: '#888' }}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
          {/* Playlist Preview List */}
          {previewLoading && (
            <Text style={styles.ratingLabel}>Loading playlist tracks...</Text>
          )}
          {previewError && <Text style={styles.errorText}>{previewError}</Text>}
          {previewTracks.length > 0 && (
            <View style={{ height: '60%', marginBottom: 8 }}>
              <Text style={styles.ratingLabel}>Preview:</Text>
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
                      artist: item.artist,
                      album: item.album ?? '',
                      coverUrl: item.coverUrl ?? '',
                      duration: item.duration ?? 0,
                      releaseDate: item.releaseDate ?? '',
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
            <Button
                title="Cancel"
                onPress={onCancel}
                color="#444444"
            />
            <Button
              title={previewLoading ? "Loading..." : "Preview"}
              onPress={handlePreview}
              disabled={previewLoading || !playlistLink}
              color="#007AFF"
            />
            <Button
              title={importLoading ? "Importing..." : "Import Playlist"}
              onPress={onImport}
              disabled={importLoading || !playlistLink}
              color="#003f82ff"
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}