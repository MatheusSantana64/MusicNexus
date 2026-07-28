import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Modal, View, Text, Image, TouchableOpacity, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import { MusicTrack } from '../types';
import { FlashList } from '@shopify/flash-list';
import { useMusicStore } from '../store/musicStore';
import { refreshTidalConnectionIfNeeded, fetchTidalPlaylistItems, fetchTidalPlaylistMetadata, addTrackToConfiguredPlaylist, removeTrackFromConfiguredPlaylist, TidalPlaylistSyncIssue } from '../services/tidal/tidalAccountService';
import { getTidalTracksByIds } from '../services/tidal/tidalApiClient';
import { saveMusicBatch } from '../services/music/musicService';
import { showToast } from '../utils/toast';
import { formatDateTimeDDMMYY_HHMM } from '../utils/dateUtils';
import { updatePlaylistCacheBatch, loadCache, getCachedPlaylistEntry } from '../services/tidal/tidalPlaylistCache';

interface PlaylistOption {
  rating: string;
  playlistId: string;
  title: string;
  trackCount?: number;
}

type SectionType = 'playlists' | 'issues';

interface ListItem {
  id: string;
  type: 'header' | 'playlistPair' | 'issue' | 'action' | 'status' | 'empty';
  section: SectionType;
  data?: any;
  sticky?: boolean;
}

interface SyncWithTidalModalProps {
  visible: boolean;
  onClose: () => void;
}

function PlaylistCard({ playlist, selected, onPress, lastSyncedAt }: { playlist: PlaylistOption; selected: boolean; onPress: () => void; lastSyncedAt?: number }) {
  return (
    <TouchableOpacity
      style={[styles.playlistCard, selected && styles.playlistCardSelected]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.playlistCardHeader}>
        <View style={[styles.checkmark, selected && styles.checkmarkSelected]}>
          {selected && <Ionicons name="checkmark" size={14} color={theme.colors.text.primary} />}
        </View>
        <Text
          style={[styles.playlistCardTitle, selected && styles.playlistCardTitleSelected]}
          numberOfLines={2}
        >
          {playlist.title}
          {lastSyncedAt != null && lastSyncedAt > 0 && (
            <Text style={styles.playlistCardTimestamp}> ({formatDateTimeDDMMYY_HHMM(new Date(lastSyncedAt).toISOString())})</Text>
          )}
        </Text>
      </View>
      {playlist.trackCount != null && (
        <Text style={styles.playlistCardMeta}>{playlist.trackCount} tracks</Text>
      )}
    </TouchableOpacity>
  );
}

export function SyncWithTidalModal({ visible, onClose }: SyncWithTidalModalProps) {
  const [playlists, setPlaylists] = useState<PlaylistOption[]>([]);
  const [selectedPlaylistIds, setSelectedPlaylistIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [issues, setIssues] = useState<TidalPlaylistSyncIssue[]>([]);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanStatus, setScanStatus] = useState<string>('Idle');
  const [resolvingTrackIds, setResolvingTrackIds] = useState<Set<string>>(new Set());
  const [bulkResolving, setBulkResolving] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<string | null>(null);
  const [missingTracksMap, setMissingTracksMap] = useState<Map<string, MusicTrack>>(new Map());
  const [lastSyncedMap, setLastSyncedMap] = useState<Map<string, number>>(new Map());

  const savedMusic = useMusicStore(state => state.savedMusic);
  const updateRating = useMusicStore(state => state.updateRating);

  useEffect(() => {
    if (!visible) return;
    setPlaylists([]);
    setSelectedPlaylistIds(new Set());
    setIssues([]);
    setScanLoading(false);
    setScanStatus('Idle');
    setMissingTracksMap(new Map());
    setBulkResolving(false);
    setBulkProgress(null);
    loadPlaylists();
  }, [visible]);

  const loadPlaylists = async () => {
    setLoading(true);
    setError(null);
    try {
      const account = await refreshTidalConnectionIfNeeded(undefined, { skipPlaylistRefresh: true });
      if (!account.connected || !account.tokenSet?.accessToken) {
        setError('Please connect your TIDAL account first.');
        return;
      }
      if (!account.ratingPlaylists || Object.keys(account.ratingPlaylists).length === 0) {
        setError('No rating playlists configured. Please configure them in Profile > TIDAL Account.');
        return;
      }
      const playlistEntries = Object.entries(account.ratingPlaylists).filter(([, id]) => id);
      const options: PlaylistOption[] = [];
      for (const [rating, playlistId] of playlistEntries) {
        const playlist = account.playlists?.find(p => p.id === playlistId);
        options.push({
          rating,
          playlistId,
          title: playlist?.title || `Rating ${rating}`,
          trackCount: playlist?.numberOfTracks,
        });
      }
      options.sort((a, b) => Number(b.rating) - Number(a.rating));
      setPlaylists(options);

      const cache = await loadCache();
      const map = new Map<string, number>();
      for (const opt of options) {
        const entry = cache[opt.playlistId];
        if (entry?.cachedAt) map.set(opt.playlistId, entry.cachedAt);
      }
      setLastSyncedMap(map);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load TIDAL playlists.');
    } finally {
      setLoading(false);
    }
  };

  const togglePlaylist = (playlistId: string) => {
    setSelectedPlaylistIds(prev => {
      const next = new Set(prev);
      if (next.has(playlistId)) next.delete(playlistId);
      else next.add(playlistId);
      return next;
    });
  };

  const toggleAllPlaylists = () => {
    if (selectedPlaylistIds.size === playlists.length) {
      setSelectedPlaylistIds(new Set());
    } else {
      setSelectedPlaylistIds(new Set(playlists.map(p => p.playlistId)));
    }
  };

  const handleScan = async () => {
    if (selectedPlaylistIds.size === 0) {
      Alert.alert('No playlists selected', 'Please select at least one playlist to scan.');
      return;
    }
    setScanLoading(true);
    setIssues([]);
    setMissingTracksMap(new Map());
    setScanStatus('Checking playlists...');
    try {
      const account = await refreshTidalConnectionIfNeeded();
      if (!account.connected || !account.tokenSet?.accessToken) throw new Error('TIDAL not connected');
      const token = account.tokenSet.accessToken;

      const selectedEntries = Object.entries(account.ratingPlaylists || {})
        .filter(([, id]) => selectedPlaylistIds.has(id));

      const metadataResults = await Promise.all(
        selectedEntries.map(async ([rating, playlistId]) => {
          setScanStatus(`Checking rating ${rating}...`);
          const meta = await fetchTidalPlaylistMetadata(playlistId, token);
          return { rating, playlistId, meta };
        })
      );

      const trackLocations = new Map<string, Array<{ playlistId: string; rating: string; addedAt?: string }>>();
      const cacheUpdates: Array<{ playlistId: string; lastModifiedAt: string; trackIds?: string[] }> = [];
      let scannedCount = 0;
      let cacheHitCount = 0;

      for (const { rating, playlistId, meta } of metadataResults) {
        setScanStatus(`Scanning rating ${rating}... (${scannedCount + 1}/${metadataResults.length})`);
        const currentLastModified = meta?.lastModifiedAt || '';
        const cached = await getCachedPlaylistEntry(playlistId);

        if (cached && cached.lastModifiedAt === currentLastModified && cached.trackIds) {
          for (const trackId of cached.trackIds) {
            const locations = trackLocations.get(trackId) || [];
            locations.push({ playlistId, rating });
            trackLocations.set(trackId, locations);
          }
          cacheHitCount++;
        } else {
          const items = await fetchTidalPlaylistItems(playlistId, token);
          const trackIds = items.map(item => String(item.id || '')).filter(Boolean);
          for (const item of items) {
            const trackId = String(item.id || '');
            if (!trackId) continue;
            const locations = trackLocations.get(trackId) || [];
            locations.push({ playlistId, rating, addedAt: item.meta?.addedAt });
            trackLocations.set(trackId, locations);
          }
          cacheUpdates.push({ playlistId, lastModifiedAt: currentLastModified, trackIds });
        }
        scannedCount++;
      }

      await updatePlaylistCacheBatch(cacheUpdates);
      if (cacheUpdates.length > 0) {
        setLastSyncedMap(prev => {
          const next = new Map(prev);
          const now = Date.now();
          for (const { playlistId } of cacheUpdates) next.set(playlistId, now);
          return next;
        });
      }

      if (cacheHitCount > 0 && cacheHitCount < metadataResults.length) {
        setScanStatus(`Scanned ${scannedCount} playlist(s) (${cacheHitCount} cached, ${scannedCount - cacheHitCount} updated)...`);
      }

      const savedMusicMap = new Map(savedMusic.map(m => [m.id, m]));
      const newIssues: TidalPlaylistSyncIssue[] = [];
      const missingTrackIds: string[] = [];

      for (const [trackId, locations] of trackLocations.entries()) {
        const libraryTrack = savedMusicMap.get(trackId);

        if (!libraryTrack) {
          missingTrackIds.push(trackId);
          newIssues.push({
            trackId,
            trackTitle: undefined,
            artist: undefined,
            playlistIds: locations.map(l => l.playlistId),
            playlistRatings: locations.map(l => l.rating),
            playlistDetails: locations,
            conflictType: 'missing',
          });
          continue;
        }

        const playlistRatings = locations.map(l => Number(l.rating));
        const uniquePlaylistRatings = [...new Set(playlistRatings)];

        if (uniquePlaylistRatings.length > 1 || locations.length > 1) {
          newIssues.push({
            trackId,
            trackTitle: libraryTrack.title,
            artist: libraryTrack.artist,
            playlistIds: locations.map(l => l.playlistId),
            playlistRatings: locations.map(l => l.rating),
            playlistDetails: locations,
            libraryRating: libraryTrack.rating,
            libraryTimestamp: libraryTrack.ratingHistory?.length
              ? new Date(Math.max(...libraryTrack.ratingHistory.map(h => Date.parse(h.timestamp)).filter(Number.isFinite))).toISOString()
              : libraryTrack.savedAt?.toISOString(),
            conflictType: 'duplicate',
          });
          continue;
        }

        const singleLocation = locations[0];
        if (Number(libraryTrack.rating) !== Number(singleLocation.rating)) {
          newIssues.push({
            trackId,
            trackTitle: libraryTrack.title,
            artist: libraryTrack.artist,
            playlistIds: [singleLocation.playlistId],
            playlistRatings: [singleLocation.rating],
            playlistDetails: [singleLocation],
            libraryRating: libraryTrack.rating,
            libraryTimestamp: libraryTrack.ratingHistory?.length
              ? new Date(Math.max(...libraryTrack.ratingHistory.map(h => Date.parse(h.timestamp)).filter(Number.isFinite))).toISOString()
              : libraryTrack.savedAt?.toISOString(),
            conflictType: 'mismatch',
          });
        }
      }

      if (missingTrackIds.length > 0) {
        setScanStatus(`Fetching details for ${missingTrackIds.length} track(s)...`);
        try {
          const tracks = await getTidalTracksByIds(missingTrackIds, token, (msg) => setScanStatus(msg), true);
          const trackMap = new Map<string, MusicTrack>();
          for (const track of tracks) {
            trackMap.set(track.id, track);
          }
          setMissingTracksMap(trackMap);
        } catch (err) {
          console.warn('[SyncWithTidalModal] Failed to fetch missing track metadata:', err);
        }
      }

      const scannedRatingToPlaylist = new Map<string, string>();
      for (const { rating, playlistId } of metadataResults) {
        scannedRatingToPlaylist.set(rating, playlistId);
      }
      const trackIdsInPlaylists = new Set(trackLocations.keys());

      for (const libraryTrack of savedMusicMap.values()) {
        const ratingKey = Number(libraryTrack.rating).toFixed(1);
        const playlistId = scannedRatingToPlaylist.get(ratingKey);
        if (!playlistId) continue;
        if (trackIdsInPlaylists.has(libraryTrack.id)) continue;
        const alreadyReported = newIssues.some(i => i.trackId === libraryTrack.id);
        if (alreadyReported) continue;

        newIssues.push({
          trackId: libraryTrack.id,
          trackTitle: libraryTrack.title,
          artist: libraryTrack.artist,
          playlistIds: [playlistId],
          playlistRatings: [ratingKey],
          playlistDetails: [{ playlistId, rating: ratingKey }],
          libraryRating: libraryTrack.rating,
          libraryTimestamp: libraryTrack.ratingHistory?.length
            ? new Date(Math.max(...libraryTrack.ratingHistory.map(h => Date.parse(h.timestamp)).filter(Number.isFinite))).toISOString()
            : libraryTrack.savedAt?.toISOString(),
          conflictType: 'not_in_playlist',
        });
      }

      setIssues(newIssues);
      setScanStatus(newIssues.length > 0
        ? `Found ${newIssues.length} conflict(s)`
        : 'No conflicts found');
    } catch (error) {
      console.error('[SyncWithTidalModal] Scan error:', error);
      setScanStatus('Scan failed');
      showToast(error instanceof Error ? error.message : 'Scan failed', 'error');
    } finally {
      setScanLoading(false);
    }
  };

  const resolveIssue = async (issue: TidalPlaylistSyncIssue, keep: 'library' | 'playlist' | 'skip' | 'remove' | 'add_to_playlist' | 'remove_from_app', selectedPlaylistId?: string) => {
    setResolvingTrackIds(prev => new Set(prev).add(issue.trackId));
    try {
      const account = await refreshTidalConnectionIfNeeded();
      if (!account.connected || !account.tokenSet?.accessToken) throw new Error('TIDAL not connected');

      if (keep === 'skip') {
        showToast('Skipped');
      } else if (keep === 'remove') {
        for (const playlistId of issue.playlistIds) {
          await removeTrackFromConfiguredPlaylist(playlistId, issue.trackId);
        }
        showToast('Removed from TIDAL playlist(s)');
      } else if (keep === 'remove_from_app') {
        const track = useMusicStore.getState().savedMusic.find(m => m.id === issue.trackId);
        if (track?.firebaseId) {
          await useMusicStore.getState().deleteMusic(track.firebaseId);
          showToast(`Removed '${track.title}' from library`);
        }
      } else if (keep === 'add_to_playlist' && selectedPlaylistId) {
        await addTrackToConfiguredPlaylist(selectedPlaylistId, issue.trackId);
        showToast('Added to TIDAL playlist');
      } else if (keep === 'library') {
        const track = useMusicStore.getState().savedMusic.find(item => item.id === issue.trackId);
        if (!track) {
          Alert.alert('Missing track', 'That track is no longer in your library.');
          return;
        }
        const keepRatingPlaylistId = account.ratingPlaylists?.[Number(track.rating).toFixed(1)];
        for (const playlistId of issue.playlistIds) {
          await removeTrackFromConfiguredPlaylist(playlistId, issue.trackId);
        }
        if (keepRatingPlaylistId) {
          await addTrackToConfiguredPlaylist(keepRatingPlaylistId, issue.trackId);
        }
        showToast('Kept library rating, updated TIDAL');
      } else if (keep === 'playlist' && selectedPlaylistId) {
        const currentSavedMusic = useMusicStore.getState().savedMusic;
        const existingTrack = currentSavedMusic.find(item => item.id === issue.trackId);
        const selectedRating = Number(
          Object.entries(account.ratingPlaylists || {}).find(([, id]) => id === selectedPlaylistId)?.[0] || '0'
        );

        for (const playlistId of issue.playlistIds) {
          if (playlistId !== selectedPlaylistId) {
            await removeTrackFromConfiguredPlaylist(playlistId, issue.trackId);
          }
        }

        if (existingTrack) {
          if (existingTrack.firebaseId && Number(existingTrack.rating) !== selectedRating) {
            await updateRating(existingTrack.firebaseId, selectedRating);
          }
          await addTrackToConfiguredPlaylist(selectedPlaylistId, issue.trackId);
          showToast('Kept TIDAL playlist version');
        } else {
          const tidalTracks = await getTidalTracksByIds([issue.trackId], account.tokenSet.accessToken);
          if (tidalTracks.length > 0) {
            const track = tidalTracks[0];
            const firebaseIds = await saveMusicBatch([track], selectedRating, [], true);
            if (firebaseIds[0]) {
              const now = new Date();
              useMusicStore.getState().addMusicBatch([{
                id: track.id,
                title: track.title,
                artist: track.artist.name,
                artistId: track.artist.id,
                album: track.album.title,
                albumId: track.album.id,
                coverUrl: track.album.cover || track.album.cover_medium || track.album.cover_small || '',
                duration: track.duration,
                rating: selectedRating,
                releaseDate: track.album.release_date,
                trackPosition: track.track_position || 1,
                diskNumber: track.disk_number || 1,
                savedAt: now,
                firebaseId: firebaseIds[0],
                tags: [],
                ratingHistory: selectedRating > 0 ? [{ rating: selectedRating, timestamp: now.toISOString() }] : [],
              }]);
              showToast(`Imported as rating ${selectedRating}`);
            }
          } else {
            showToast('Failed to fetch track from TIDAL', 'error');
          }
        }
      }
      setIssues(prev => prev.filter(item => item.trackId !== issue.trackId));
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Resolution failed', 'error');
    } finally {
      setResolvingTrackIds(prev => {
        const next = new Set(prev);
        next.delete(issue.trackId);
        return next;
      });
    }
  };

  const resolveAllIssues = async () => {
    if (issues.length === 0) return;
    setBulkResolving(true);
    setBulkProgress(`Syncing 0/${issues.length}...`);
    try {
      const account = await refreshTidalConnectionIfNeeded();
      if (!account.connected || !account.tokenSet?.accessToken) throw new Error('TIDAL not connected');

      const snapshot = [...issues];
      let resolved = 0;

      for (const issue of snapshot) {
        setBulkProgress(`Syncing ${resolved + 1}/${snapshot.length}...`);
        try {
          if (issue.conflictType === 'not_in_playlist') {
            const playlistId = issue.playlistIds[0];
            if (playlistId) await addTrackToConfiguredPlaylist(playlistId, issue.trackId);
          } else if (issue.conflictType === 'missing') {
            const rating = Number(issue.playlistRatings[0] || '0');
            const tidalTracks = await getTidalTracksByIds([issue.trackId], account.tokenSet.accessToken, undefined, true);
            if (tidalTracks.length > 0) {
              const track = tidalTracks[0];
              const firebaseIds = await saveMusicBatch([track], rating, [], true);
              if (firebaseIds[0]) {
                const now = new Date();
                useMusicStore.getState().addMusicBatch([{
                  id: track.id, title: track.title, artist: track.artist.name,
                  artistId: track.artist.id, album: track.album.title, albumId: track.album.id,
                  coverUrl: track.album.cover || track.album.cover_medium || track.album.cover_small || '',
                  duration: track.duration, rating, releaseDate: track.album.release_date,
                  trackPosition: track.track_position || 1, diskNumber: track.disk_number || 1,
                  savedAt: now, firebaseId: firebaseIds[0], tags: [],
                  ratingHistory: rating > 0 ? [{ rating, timestamp: now.toISOString() }] : [],
                }]);
              }
            }
          } else if (issue.conflictType === 'mismatch' || issue.conflictType === 'duplicate') {
            const libraryAt = issue.libraryTimestamp ? Date.parse(issue.libraryTimestamp) : 0;
            const newestPlaylistAt = Math.max(...(issue.playlistDetails || []).map(d => Date.parse(d.addedAt || '')).filter(Number.isFinite), 0);

            if (libraryAt >= newestPlaylistAt) {
              const track = useMusicStore.getState().savedMusic.find(m => m.id === issue.trackId);
              if (track) {
                const keepRatingPlaylistId = account.ratingPlaylists?.[Number(track.rating).toFixed(1)];
                for (const pid of issue.playlistIds) {
                  if (pid !== keepRatingPlaylistId) await removeTrackFromConfiguredPlaylist(pid, issue.trackId);
                }
                if (keepRatingPlaylistId) await addTrackToConfiguredPlaylist(keepRatingPlaylistId, issue.trackId);
              }
            } else {
              const newestDetail = (issue.playlistDetails || []).find(d => Date.parse(d.addedAt || '') === newestPlaylistAt);
              if (newestDetail) {
                const selectedRating = Number(newestDetail.rating);
                for (const pid of issue.playlistIds) {
                  if (pid !== newestDetail.playlistId) await removeTrackFromConfiguredPlaylist(pid, issue.trackId);
                }
                const existingTrack = useMusicStore.getState().savedMusic.find(m => m.id === issue.trackId);
                if (existingTrack) {
                  if (existingTrack.firebaseId && Number(existingTrack.rating) !== selectedRating) {
                    await updateRating(existingTrack.firebaseId, selectedRating);
                  }
                  await addTrackToConfiguredPlaylist(newestDetail.playlistId, issue.trackId);
                } else {
                  const tidalTracks = await getTidalTracksByIds([issue.trackId], account.tokenSet.accessToken, undefined, true);
                  if (tidalTracks.length > 0) {
                    const track = tidalTracks[0];
                    const firebaseIds = await saveMusicBatch([track], selectedRating, [], true);
                    if (firebaseIds[0]) {
                      const now = new Date();
                      useMusicStore.getState().addMusicBatch([{
                        id: track.id, title: track.title, artist: track.artist.name,
                        artistId: track.artist.id, album: track.album.title, albumId: track.album.id,
                        coverUrl: track.album.cover || track.album.cover_medium || track.album.cover_small || '',
                        duration: track.duration, rating: selectedRating, releaseDate: track.album.release_date,
                        trackPosition: track.track_position || 1, diskNumber: track.disk_number || 1,
                        savedAt: now, firebaseId: firebaseIds[0], tags: [],
                        ratingHistory: selectedRating > 0 ? [{ rating: selectedRating, timestamp: now.toISOString() }] : [],
                      }]);
                    }
                  }
                }
              }
            }
          }
          resolved++;
          setIssues(prev => prev.filter(i => i.trackId !== issue.trackId));
        } catch (err) {
          showToast(`Failed: ${err instanceof Error ? err.message : err}`, 'error');
        }
      }

      if (resolved > 0) showToast(`Synced ${resolved} conflict(s)`);
      setBulkProgress(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Bulk sync failed', 'error');
    } finally {
      setBulkResolving(false);
      setBulkProgress(null);
    }
  };

  const syncFromTidal = async () => {
    if (issues.length === 0) return;
    setBulkResolving(true);
    setBulkProgress(`Syncing from TIDAL 0/${issues.length}...`);
    const snapshot = [...issues];
    let resolved = 0;
    for (const issue of snapshot) {
      setBulkProgress(`Syncing from TIDAL ${resolved + 1}/${snapshot.length}...`);
      try {
        if (issue.conflictType === 'not_in_playlist') {
          resolved++;
          setIssues(prev => prev.filter(i => i.trackId !== issue.trackId));
          continue;
        }
        const account = await refreshTidalConnectionIfNeeded();
        if (!account.connected || !account.tokenSet?.accessToken) throw new Error('TIDAL not connected');

        if (issue.conflictType === 'missing') {
          const tidalTracks = await getTidalTracksByIds([issue.trackId], account.tokenSet.accessToken, undefined, true);
          if (tidalTracks.length > 0) {
            const track = tidalTracks[0];
            const rating = Number(issue.playlistRatings[0] || '0');
            const firebaseIds = await saveMusicBatch([track], rating, [], true);
            if (firebaseIds[0]) {
              const now = new Date();
              useMusicStore.getState().addMusicBatch([{
                id: track.id, title: track.title, artist: track.artist.name,
                artistId: track.artist.id, album: track.album.title, albumId: track.album.id,
                coverUrl: track.album.cover || track.album.cover_medium || track.album.cover_small || '',
                duration: track.duration, rating, releaseDate: track.album.release_date,
                trackPosition: track.track_position || 1, diskNumber: track.disk_number || 1,
                savedAt: now, firebaseId: firebaseIds[0], tags: [],
                ratingHistory: rating > 0 ? [{ rating, timestamp: now.toISOString() }] : [],
              }]);
            }
          }
        } else {
          const tidalRating = Number(issue.playlistRatings?.[0] || '0');
          const existingTrack = useMusicStore.getState().savedMusic.find(m => m.id === issue.trackId);
          if (existingTrack && existingTrack.firebaseId && Number(existingTrack.rating) !== tidalRating) {
            await updateRating(existingTrack.firebaseId, tidalRating);
          }
        }
        resolved++;
        setIssues(prev => prev.filter(i => i.trackId !== issue.trackId));
      } catch (err) {
        showToast(`Failed: ${err instanceof Error ? err.message : err}`, 'error');
      }
    }
    if (resolved > 0) showToast(`Synced ${resolved} from TIDAL`);
    setBulkResolving(false);
    setBulkProgress(null);
  };

  const syncFromLibrary = async () => {
    if (issues.length === 0) return;
    setBulkResolving(true);
    setBulkProgress(`Syncing from Library 0/${issues.length}...`);
    const snapshot = [...issues];
    let resolved = 0;
    for (const issue of snapshot) {
      setBulkProgress(`Syncing from Library ${resolved + 1}/${snapshot.length}...`);
      try {
        const account = await refreshTidalConnectionIfNeeded();
        if (!account.connected || !account.tokenSet?.accessToken) throw new Error('TIDAL not connected');

        if (issue.conflictType === 'not_in_playlist') {
          const playlistId = issue.playlistIds[0];
          if (playlistId) {
            await addTrackToConfiguredPlaylist(playlistId, issue.trackId);
          }
        } else {
          const existingTrack = useMusicStore.getState().savedMusic.find(m => m.id === issue.trackId);
          const libraryRating = existingTrack ? existingTrack.rating : null;
          const libraryRatingStr = libraryRating != null ? Number(libraryRating).toFixed(1) : null;
          const targetPlaylistId = libraryRatingStr ? account.ratingPlaylists?.[libraryRatingStr] : null;

          if (libraryRating !== null && targetPlaylistId) {
            for (const pid of issue.playlistIds) {
              if (pid !== targetPlaylistId) {
                await removeTrackFromConfiguredPlaylist(pid, issue.trackId);
              }
            }
            if (!issue.playlistIds.includes(targetPlaylistId)) {
              await addTrackToConfiguredPlaylist(targetPlaylistId, issue.trackId);
            }
          } else if (libraryRating === null) {
            for (const pid of issue.playlistIds) {
              await removeTrackFromConfiguredPlaylist(pid, issue.trackId);
            }
          } else if (!targetPlaylistId) {
            showToast(`No playlist configured for rating ${libraryRating}`, 'error');
          }
        }
        resolved++;
        setIssues(prev => prev.filter(i => i.trackId !== issue.trackId));
      } catch (err) {
        showToast(`Failed: ${err instanceof Error ? err.message : err}`, 'error');
      }
    }
    if (resolved > 0) showToast(`Synced ${resolved} from Library`);
    setBulkResolving(false);
    setBulkProgress(null);
  };

  const listData = useMemo(() => {
    const items: ListItem[] = [];

    if (loading) {
      items.push({
        id: 'loading',
        type: 'empty',
        section: 'playlists',
        data: { message: 'Loading playlists...' },
      });
      return items;
    }

    if (error) {
      items.push({
        id: 'error',
        type: 'empty',
        section: 'playlists',
        data: { message: error, isError: true },
      });
      return items;
    }

    if (playlists.length === 0) {
      items.push({
        id: 'empty',
        type: 'empty',
        section: 'playlists',
        data: { message: 'No configured rating playlists found.\nConfigure them in Profile > TIDAL Account first.' },
      });
      return items;
    }

    items.push({
      id: 'header-playlists',
      type: 'header',
      section: 'playlists',
      sticky: true,
      data: { title: 'Sync Ratings with TIDAL', showSelectAll: true },
    });

    playlists.forEach((pl, index) => {
      if (index % 2 === 0) {
        const next = playlists[index + 1];
        items.push({
          id: `playlistPair-${pl.playlistId}-${next?.playlistId || ''}`,
          type: 'playlistPair',
          section: 'playlists',
          data: { left: pl, right: next || null },
        });
      }
    });

    items.push({
      id: 'selection-summary',
      type: 'status',
      section: 'playlists',
      data: { message: `${selectedPlaylistIds.size} of ${playlists.length} playlist(s) selected` },
    });

    items.push({
      id: 'action-scan',
      type: 'action',
      section: 'playlists',
      data: {
        label: scanLoading ? 'Scanning...' : 'Scan for conflicts',
        onPress: handleScan,
        disabled: scanLoading || selectedPlaylistIds.size === 0,
        loading: scanLoading,
      },
    });

    if (scanStatus && scanStatus !== 'Idle') {
      items.push({
        id: 'scan-status',
        type: 'status',
        section: 'playlists',
        data: { message: scanStatus },
      });
    }

    if (issues.length > 0) {
      items.push({
        id: 'header-issues',
        type: 'header',
        section: 'issues',
        sticky: true,
        data: { title: `Conflicts (${issues.length})`, showSyncAll: true, showSyncFromTidal: true, showSyncFromLibrary: true },
      });

      if (bulkProgress) {
        items.push({
          id: 'bulk-progress',
          type: 'status',
          section: 'issues',
          data: { message: bulkProgress },
        });
      }

      issues.forEach((issue, index) => {
        items.push({
          id: `issue-${issue.trackId}-${index}`,
          type: 'issue',
          section: 'issues',
          data: { issue, index, busy: resolvingTrackIds.has(issue.trackId) },
        });
      });
    } else if (!scanLoading && scanStatus !== 'Idle') {
      items.push({
        id: 'no-conflicts',
        type: 'empty',
        section: 'issues',
        data: { message: 'No conflicts found\nYour library ratings match the selected TIDAL playlists.' },
      });
    }

    return items;
  }, [
    loading, error, playlists, selectedPlaylistIds,
    scanLoading, scanStatus, issues, resolvingTrackIds,
    handleScan,
  ]);

  const getItemType = useCallback((item: ListItem) => item.type, []);

  const renderItem = useCallback(({ item }: { item: ListItem }) => {
    const { type, data } = item;

    switch (type) {
      case 'header':
        return (
          <View style={styles.stickyHeader}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{data.title}</Text>
              {data.showSelectAll && (
                <TouchableOpacity onPress={toggleAllPlaylists} style={styles.selectAllButton}>
                  <Text style={styles.selectAllText}>
                    {selectedPlaylistIds.size === playlists.length ? 'Deselect all' : 'Select all'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            {(data.showSyncAll || data.showSyncFromTidal || data.showSyncFromLibrary) && (
              <View style={styles.syncButtonRow}>
                {data.showSyncAll && (
                  <TouchableOpacity onPress={() => Alert.alert('Sync All', 'Resolve all conflicts using timestamps to pick newest?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Sync', onPress: resolveAllIssues }])} disabled={bulkResolving} style={styles.syncAllButton}>
                    {bulkResolving ? (
                      <ActivityIndicator size="small" color={theme.colors.text.primary} />
                    ) : (
                      <Text style={styles.syncAllText}>Sync All</Text>
                    )}
                  </TouchableOpacity>
                )}
                <View style={styles.syncRightButtons}>
                  {data.showSyncFromTidal && (
                    <TouchableOpacity onPress={() => Alert.alert('From TIDAL', 'Overwrite library to match TIDAL playlists?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Sync', onPress: syncFromTidal }])} disabled={bulkResolving} style={styles.syncButtonTidal}>
                      <Text style={styles.syncAllText}>From TIDAL</Text>
                    </TouchableOpacity>
                  )}
                  {data.showSyncFromLibrary && (
                    <TouchableOpacity onPress={() => Alert.alert('From Library', 'Overwrite TIDAL playlists to match library ratings?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Sync', onPress: syncFromLibrary }])} disabled={bulkResolving} style={styles.syncButtonLibrary}>
                      <Text style={styles.syncAllText}>From Library</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}
          </View>
        );

      case 'playlistPair': {
        const { left, right } = data;
        return (
          <View style={styles.playlistPairRow}>
            <PlaylistCard
              playlist={left}
              selected={selectedPlaylistIds.has(left.playlistId)}
              onPress={() => togglePlaylist(left.playlistId)}
              lastSyncedAt={lastSyncedMap.get(left.playlistId)}
            />
            {right && (
              <PlaylistCard
                playlist={right}
                selected={selectedPlaylistIds.has(right.playlistId)}
                onPress={() => togglePlaylist(right.playlistId)}
                lastSyncedAt={lastSyncedMap.get(right.playlistId)}
              />
            )}
          </View>
        );
      }

      case 'issue': {
        const { issue, busy } = data;
        const isMissing = issue.conflictType === 'missing';
        const missingTrack = isMissing ? missingTracksMap.get(issue.trackId) : undefined;
        const libraryAt = issue.libraryTimestamp ? Date.parse(issue.libraryTimestamp) : 0;
        const newestPlaylistAt = Math.max(...(issue.playlistDetails || []).map((d: { addedAt?: string }) => Date.parse(d.addedAt || '')).filter(Number.isFinite), 0);
        const newestSource = libraryAt >= newestPlaylistAt ? 'library' : 'playlist';

        const uniquePlaylistButtons = new Map<string, { playlistId: string; rating: string }>();
        issue.playlistIds.forEach((playlistId: string, index: number) => {
          const key = issue.playlistRatings[index];
          if (!uniquePlaylistButtons.has(key)) {
            uniquePlaylistButtons.set(key, { playlistId, rating: key });
          }
        });

        const trackTitle = missingTrack?.title || issue.trackTitle || issue.trackId;
        const artistName = missingTrack?.artist?.name || issue.artist || 'Unknown artist';
        const coverUrl = missingTrack?.album?.cover || missingTrack?.album?.cover_medium || missingTrack?.album?.cover_small || '';

        return (
          <View style={styles.issueItem} key={issue.trackId + issue.conflictType}>
            {isMissing && (
              <View style={styles.missingTrackRow}>
                {coverUrl ? (
                  <Image source={{ uri: coverUrl }} style={styles.missingTrackCover} />
                ) : (
                  <View style={[styles.missingTrackCover, styles.missingTrackCoverPlaceholder]}>
                    <Ionicons name="musical-notes" size={20} color={theme.colors.text.muted} />
                  </View>
                )}
                <View style={styles.missingTrackInfo}>
                  <Text style={styles.issueTitle} numberOfLines={1}>{trackTitle}</Text>
                  <Text style={styles.issueSubtitle} numberOfLines={1}>{artistName}</Text>
                </View>
              </View>
            )}
            {!isMissing && (
              <>
                <Text style={styles.issueTitle} numberOfLines={2}>{trackTitle}</Text>
                <Text style={styles.issueSubtitle} numberOfLines={2}>
                  {artistName}
                  {issue.libraryRating != null && ` — library ${issue.libraryRating}`}
                  {uniquePlaylistButtons.size > 0 && ` — playlists ${issue.playlistRatings.join(', ')}`}
                </Text>
              </>
            )}
            <View style={styles.timestampRow}>
              {issue.libraryTimestamp && (
                <View style={styles.playlistDetailBlock}>
                  <Text style={[styles.playlistDetailTag, newestSource === 'library' && styles.timestampHighlight]}>Library</Text>
                  <Text style={[styles.timestamp, newestSource === 'library' && styles.timestampHighlight]}>
                    {formatDateTimeDDMMYY_HHMM(issue.libraryTimestamp)}
                  </Text>
                </View>
              )}
              {(issue.playlistDetails || []).map((detail: { playlistId: string; rating: string; addedAt?: string }) => {
                const isNewest = detail.addedAt && Date.parse(detail.addedAt) === newestPlaylistAt && newestSource === 'playlist';
                return (
                  <View key={detail.playlistId} style={styles.playlistDetailBlock}>
                    <Text style={[styles.playlistDetailTag, isNewest && styles.timestampHighlight]}>{detail.rating}</Text>
                    <Text style={[styles.timestamp, isNewest && styles.timestampHighlight]}>
                      {detail.addedAt ? formatDateTimeDDMMYY_HHMM(detail.addedAt) : 'unknown'}
                    </Text>
                  </View>
                );
              })}
            </View>
            <Text style={styles.issueType}>
              {isMissing ? 'Song not in library.' : issue.conflictType === 'duplicate' ? 'Song is on multiple playlists.' : issue.conflictType === 'not_in_playlist' ? 'Song in library but missing from its rating playlist.' : 'Song is on a different rating playlist than your library rating.'}
            </Text>
            <View style={styles.issueActions}>
              {issue.conflictType === 'not_in_playlist' ? (
                <>
                  {Array.from(uniquePlaylistButtons.values()).map(({ playlistId, rating }) => (
                    <TouchableOpacity
                      key={playlistId}
                      onPress={() => resolveIssue(issue, 'add_to_playlist', playlistId)}
                      disabled={busy}
                      style={[styles.issueActionButton, styles.issueActionButtonPlaylist]}
                    >
                      <Text style={styles.issueActionButtonText}>{busy ? 'Working...' : `Add to TIDAL with rating ${rating}`}</Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity
                    onPress={() => resolveIssue(issue, 'remove_from_app')}
                    disabled={busy}
                    style={[styles.issueActionButton, styles.issueActionButtonRemove]}
                  >
                    <Text style={styles.issueActionButtonText}>{busy ? 'Working...' : 'Remove from app'}</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  {!isMissing && (
                    <TouchableOpacity
                      onPress={() => resolveIssue(issue, 'library')}
                      disabled={busy}
                      style={[styles.issueActionButton, styles.issueActionButtonLibrary]}
                    >
                      <Text style={styles.issueActionButtonText}>{busy ? 'Working...' : 'Keep library'}</Text>
                    </TouchableOpacity>
                  )}
                  {Array.from(uniquePlaylistButtons.values()).map(({ playlistId, rating }) => (
                    <TouchableOpacity
                      key={playlistId}
                      onPress={() => resolveIssue(issue, 'playlist', playlistId)}
                      disabled={busy}
                      style={[styles.issueActionButton, styles.issueActionButtonPlaylist]}
                    >
                      <Text style={styles.issueActionButtonText}>
                        {busy ? 'Working...' : isMissing ? `Import to app with rating ${rating}` : `Keep ${rating}`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  {isMissing && (
                    <TouchableOpacity
                      onPress={() => resolveIssue(issue, 'remove')}
                      disabled={busy}
                      style={[styles.issueActionButton, styles.issueActionButtonRemove]}
                    >
                      <Text style={styles.issueActionButtonText}>{busy ? 'Working...' : 'Remove from TIDAL'}</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
          </View>
        );
      }

      case 'action':
        return (
          <TouchableOpacity
            onPress={data.onPress}
            disabled={data.disabled}
            style={[
              styles.actionButton,
              data.primary && styles.actionButtonPrimary,
              data.loading && styles.actionButtonLoading,
            ]}
          >
            {data.loading ? (
              <ActivityIndicator color={theme.colors.text.primary} />
            ) : (
              <Text style={styles.actionButtonText}>{data.label}</Text>
            )}
          </TouchableOpacity>
        );

      case 'status':
        return (
          <Text style={[
            styles.statusText,
            data.isError && styles.errorText,
            data.muted && styles.existingText,
          ]}>{data.message}</Text>
        );

      case 'empty':
        return (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, data.isError && styles.errorText]}>{data.message}</Text>
          </View>
        );

      default:
        return null;
    }
  }, [playlists, selectedPlaylistIds, toggleAllPlaylists, resolveIssue, resolveAllIssues, syncFromTidal, syncFromLibrary, missingTracksMap, lastSyncedMap, bulkResolving]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <FlashList
            data={listData}
            renderItem={renderItem}
            keyExtractor={item => item.id}
            getItemType={getItemType}
            estimatedItemSize={80}
            showsVerticalScrollIndicator={false}
            stickyHeaderIndices={listData
              .map((item, index) => (item.sticky ? index : -1))
              .filter(index => index !== -1)}
            contentContainerStyle={{ paddingBottom: 20 }}
            nestedScrollEnabled
          />
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 16,
  },
  modalContent: {
    flex: 1,
    backgroundColor: theme.colors.background.amoled,
    borderRadius: theme.borderRadius.lg,
    borderColor: theme.colors.border,
    borderWidth: 1,
    maxHeight: '95%',
    overflow: 'hidden',
  },
  closeButton: {
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
    alignItems: 'center',
  },
  closeButtonText: {
    color: theme.colors.text.primary,
    fontSize: theme.sizes.body,
    fontWeight: theme.weights.bold,
  },
  stickyHeader: {
    backgroundColor: theme.colors.background.amoled,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
    paddingHorizontal: 16,
    paddingVertical: 10,
    zIndex: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  syncButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  syncRightButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  sectionTitle: {
    fontSize: theme.sizes.medium,
    color: theme.colors.text.primary,
    fontWeight: theme.weights.bold,
  },
  selectAllButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  syncAllButton: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    backgroundColor: theme.colors.button.primary,
    borderRadius: theme.borderRadius.sm,
  },
  syncButtonTidal: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    backgroundColor: '#2b5a2b',
    borderRadius: theme.borderRadius.sm,
  },
  syncButtonLibrary: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    backgroundColor: '#5a2b5a',
    borderRadius: theme.borderRadius.sm,
  },
  syncAllText: {
    color: theme.colors.text.primary,
    fontSize: theme.sizes.small,
    fontWeight: theme.weights.bold,
  },
  selectAllText: {
    color: theme.colors.text.blue,
    fontSize: theme.sizes.small,
    fontWeight: theme.weights.medium,
  },
  playlistPairRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    gap: 10,
    marginTop: 8,
  },
  playlistCard: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: theme.colors.background.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  playlistCardSelected: {
    borderColor: theme.colors.button.primary,
    backgroundColor: '#001a3a',
  },
  playlistCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkmark: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkSelected: {
    backgroundColor: theme.colors.button.primary,
    borderColor: theme.colors.button.primary,
  },
  playlistCardTitle: {
    flex: 1,
    color: theme.colors.text.primary,
    fontSize: theme.sizes.small,
    fontWeight: theme.weights.medium,
  },
  playlistCardTitleSelected: {
    color: theme.colors.text.primary,
  },
  playlistCardMeta: {
    marginTop: 6,
    marginLeft: 28,
    color: theme.colors.text.muted,
    fontSize: theme.sizes.xsmall,
  },
  playlistCardTimestamp: {
    color: theme.colors.text.muted,
    fontSize: 9,
  },
  actionButton: {
    backgroundColor: theme.colors.button.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
    marginHorizontal: 16,
    marginTop: 16,
  },
  actionButtonPrimary: {
    backgroundColor: theme.colors.button.success,
  },
  actionButtonLoading: {
    opacity: 0.7,
  },
  actionButtonText: {
    color: theme.colors.text.primary,
    fontWeight: theme.weights.bold,
    fontSize: theme.sizes.body,
  },
  statusText: {
    marginTop: 8,
    marginHorizontal: 16,
    color: theme.colors.text.secondary,
    fontSize: theme.sizes.small,
    textAlign: 'center',
  },
  existingText: {
    marginTop: 4,
    marginHorizontal: 16,
    color: theme.colors.text.muted,
    fontSize: theme.sizes.small,
    textAlign: 'center',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    color: theme.colors.text.secondary,
    fontSize: theme.sizes.body,
    textAlign: 'center',
  },
  errorText: {
    color: theme.colors.text.error,
  },
  issueItem: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 12,
    backgroundColor: theme.colors.background.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  missingTrackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 10,
  },
  missingTrackCover: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.sm,
  },
  missingTrackCoverPlaceholder: {
    backgroundColor: theme.colors.background.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  missingTrackInfo: {
    flex: 1,
  },
  issueTitle: {
    color: theme.colors.text.primary,
    fontSize: theme.sizes.body,
    fontWeight: theme.weights.semibold,
  },
  issueSubtitle: {
    marginTop: 4,
    color: theme.colors.text.secondary,
    fontSize: theme.sizes.small,
  },
  playlistDetailBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  playlistDetailTag: {
    backgroundColor: theme.colors.button.primary + '30',
    color: theme.colors.button.primary,
    fontSize: theme.sizes.xsmall,
    fontWeight: theme.weights.bold,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  timestampRow: {
    marginTop: 8,
    gap: 4,
  },
  timestamp: {
    color: theme.colors.text.secondary,
    fontSize: theme.sizes.small,
  },
  timestampHighlight: {
    color: theme.colors.button.primary,
    fontWeight: theme.weights.bold,
  },
  issueType: {
    marginTop: 4,
    color: theme.colors.text.muted,
    fontSize: theme.sizes.xsmall,
  },
  issueActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    flexWrap: 'wrap',
  },
  issueActionButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: theme.borderRadius.sm,
    minWidth: 120,
    alignItems: 'center',
  },
  issueActionButtonLibrary: {
    backgroundColor: '#2b2b2b',
  },
  issueActionButtonPlaylist: {
    backgroundColor: theme.colors.button.primary,
  },
  issueActionButtonRemove: {
    backgroundColor: theme.colors.button.delete,
  },
  issueActionButtonText: {
    color: theme.colors.text.primary,
    fontWeight: theme.weights.bold,
    fontSize: theme.sizes.small,
  },
});
