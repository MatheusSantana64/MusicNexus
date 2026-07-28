import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Modal, View, Text, Image, TouchableOpacity, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import { MusicTrack, Tag } from '../types';
import { FlashList } from '@shopify/flash-list';
import { useMusicStore } from '../store/musicStore';
import { useTagStore } from '../store/tagStore';
import { refreshTidalConnectionIfNeeded, fetchTidalPlaylistItems, fetchTidalPlaylistMetadata, addTrackToConfiguredPlaylist, removeTrackFromConfiguredPlaylist } from '../services/tidal/tidalAccountService';
import { getTidalTracksByIds } from '../services/tidal/tidalApiClient';
import { saveMusicBatch } from '../services/music/musicService';
import { showToast } from '../utils/toast';
import { updatePlaylistCacheBatch, loadCache, getCachedPlaylistEntry } from '../services/tidal/tidalPlaylistCache';
import { formatDateTimeDDMMYY_HHMM } from '../utils/dateUtils';

interface PlaylistOption {
  tagId: string;
  playlistId: string;
  title: string;
  tagName: string;
  trackCount?: number;
}

interface TagSyncIssue {
  trackId: string;
  trackTitle?: string;
  artist?: string;
  tagId: string;
  playlistId: string;
  tagName: string;
  libraryTags?: string[];
  conflictType: 'missing_tag' | 'not_in_playlist' | 'missing_from_app';
}

type SectionType = 'playlists' | 'issues';

interface ListItem {
  id: string;
  type: 'header' | 'playlistPair' | 'issue' | 'action' | 'status' | 'empty';
  section: SectionType;
  data?: any;
  sticky?: boolean;
}

interface SyncTagPlaylistsModalProps {
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
      <View style={[styles.checkmark, selected && styles.checkmarkSelected]}>
        {selected && <Ionicons name="checkmark" size={14} color={theme.colors.text.primary} />}
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={[styles.playlistCardTitle, selected && styles.playlistCardTitleSelected]}
          numberOfLines={1}
        >
          {playlist.tagName}
        </Text>
        {lastSyncedAt != null && lastSyncedAt > 0 && (
          <Text style={styles.playlistCardTimestamp}>{formatDateTimeDDMMYY_HHMM(new Date(lastSyncedAt).toISOString())}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

export function SyncTagPlaylistsModal({ visible, onClose }: SyncTagPlaylistsModalProps) {
  const [playlists, setPlaylists] = useState<PlaylistOption[]>([]);
  const [selectedPlaylistIds, setSelectedPlaylistIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [issues, setIssues] = useState<TagSyncIssue[]>([]);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanStatus, setScanStatus] = useState<string>('Idle');
  const [resolvingTrackIds, setResolvingTrackIds] = useState<Set<string>>(new Set());
  const [bulkResolving, setBulkResolving] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<string | null>(null);
  const [missingTracksMap, setMissingTracksMap] = useState<Map<string, MusicTrack>>(new Map());
  const [lastSyncedMap, setLastSyncedMap] = useState<Map<string, number>>(new Map());

  const savedMusic = useMusicStore(state => state.savedMusic);
  const updateSong = useMusicStore(state => state.updateSong);
  const tags = useTagStore(state => state.tags);

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

      const tagPlaylists = tags.filter(t => t.tidalPlaylistId);
      if (tagPlaylists.length === 0) {
        setError('No tags with TIDAL playlists configured. Configure them in Tags > gear icon.');
        return;
      }

      const options: PlaylistOption[] = [];
      for (const tag of tagPlaylists) {
        const playlist = account.playlists?.find(p => p.id === tag.tidalPlaylistId);
        options.push({
          tagId: tag.id,
          playlistId: tag.tidalPlaylistId!,
          title: playlist?.title || `${tag.name}`,
          tagName: tag.name,
          trackCount: playlist?.numberOfTracks,
        });
      }
      options.sort((a, b) => a.title.localeCompare(b.title));
      setPlaylists(options);

      const cache = await loadCache();
      const map = new Map<string, number>();
      for (const opt of options) {
        const entry = cache[opt.playlistId];
        if (entry?.cachedAt) map.set(opt.playlistId, entry.cachedAt);
      }
      setLastSyncedMap(map);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load tag TIDAL playlists.');
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
      Alert.alert('No playlists selected', 'Please select at least one tag playlist to scan.');
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

      const selectedPlaylists = playlists.filter(p => selectedPlaylistIds.has(p.playlistId));

      const cacheUpdates: Array<{ playlistId: string; lastModifiedAt: string; trackIds?: string[] }> = [];
      const playlistTrackMap = new Map<string, { tagId: string; trackIds: string[] }>();
      let scannedCount = 0;
      let cacheHitCount = 0;

      for (const pl of selectedPlaylists) {
        setScanStatus(`Scanning "${pl.title}"... (${scannedCount + 1}/${selectedPlaylists.length})`);

        const meta = await fetchTidalPlaylistMetadata(pl.playlistId, token);
        const currentLastModified = meta?.lastModifiedAt || '';
        const cached = await getCachedPlaylistEntry(pl.playlistId);

        let trackIds: string[];
        if (cached && cached.lastModifiedAt === currentLastModified && cached.trackIds) {
          trackIds = cached.trackIds;
          cacheHitCount++;
        } else {
          const items = await fetchTidalPlaylistItems(pl.playlistId, token);
          trackIds = items.map(item => String(item.id || '')).filter(Boolean);
          cacheUpdates.push({ playlistId: pl.playlistId, lastModifiedAt: currentLastModified, trackIds });
        }

        playlistTrackMap.set(pl.playlistId, { tagId: pl.tagId, trackIds });
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

      if (cacheHitCount > 0 && cacheHitCount < selectedPlaylists.length) {
        setScanStatus(`Scanned ${scannedCount} playlist(s) (${cacheHitCount} cached)...`);
      }

      const savedMusicMap = new Map(savedMusic.map(m => [m.id, m]));
      const newIssues: TagSyncIssue[] = [];
      const missingTrackIds: string[] = [];

      for (const [playlistId, { tagId, trackIds }] of playlistTrackMap.entries()) {
        const pl = selectedPlaylists.find(p => p.playlistId === playlistId)!;
        for (const trackId of trackIds) {
          const libraryTrack = savedMusicMap.get(trackId);
          if (!libraryTrack) {
            missingTrackIds.push(trackId);
            newIssues.push({
              trackId,
              tagId,
              playlistId,
              tagName: pl.tagName,
              conflictType: 'missing_from_app',
            });
            continue;
          }
          const hasTag = libraryTrack.tags?.includes(tagId);
          if (!hasTag) {
            newIssues.push({
              trackId,
              trackTitle: libraryTrack.title,
              artist: libraryTrack.artist,
              tagId,
              playlistId,
              tagName: pl.tagName,
              libraryTags: libraryTrack.tags,
              conflictType: 'missing_tag',
            });
          }
        }
      }

      for (const libraryTrack of savedMusicMap.values()) {
        if (!libraryTrack.tags || libraryTrack.tags.length === 0) continue;
        for (const tagId of libraryTrack.tags) {
          const tag = tags.find(t => t.id === tagId);
          if (!tag?.tidalPlaylistId) continue;
          const plPlaylistId = tag.tidalPlaylistId;
          if (!selectedPlaylistIds.has(plPlaylistId)) continue;
          const entry = playlistTrackMap.get(plPlaylistId);
          if (!entry) continue;
          if (entry.trackIds.includes(libraryTrack.id)) continue;
          const alreadyReported = newIssues.some(i => i.trackId === libraryTrack.id);
          if (alreadyReported) continue;
          newIssues.push({
            trackId: libraryTrack.id,
            trackTitle: libraryTrack.title,
            artist: libraryTrack.artist,
            tagId,
            playlistId: plPlaylistId,
            tagName: tag.name,
            libraryTags: libraryTrack.tags,
            conflictType: 'not_in_playlist',
          });
        }
      }

      if (missingTrackIds.length > 0) {
        setScanStatus(`Fetching details for ${missingTrackIds.length} track(s)...`);
        try {
          const tracks = await getTidalTracksByIds(missingTrackIds, token, (msg) => setScanStatus(msg), true);
          const trackMap = new Map<string, MusicTrack>();
          for (const track of tracks) trackMap.set(track.id, track);
          setMissingTracksMap(trackMap);
        } catch (err) {
          console.warn('[SyncTagPlaylistsModal] Failed to fetch missing track metadata:', err);
        }
      }

      setIssues(newIssues);
      setScanStatus(newIssues.length > 0
        ? `Found ${newIssues.length} conflict(s)`
        : 'No conflicts found');
    } catch (error) {
      console.error('[SyncTagPlaylistsModal] Scan error:', error);
      setScanStatus('Scan failed');
      showToast(error instanceof Error ? error.message : 'Scan failed', 'error');
    } finally {
      setScanLoading(false);
    }
  };

  const resolveIssue = async (issue: TagSyncIssue, action: 'add_tag' | 'add_to_playlist' | 'import_and_tag' | 'remove_from_playlist') => {
    setResolvingTrackIds(prev => new Set(prev).add(issue.trackId));
    try {
      const account = await refreshTidalConnectionIfNeeded();
      if (!account.connected || !account.tokenSet?.accessToken) throw new Error('TIDAL not connected');

      if (action === 'add_tag') {
        const track = useMusicStore.getState().savedMusic.find(m => m.id === issue.trackId);
        if (track) {
          const newTags = [...(track.tags || []), issue.tagId];
          if (track.firebaseId) {
            await updateSong(track.firebaseId, { tags: newTags });
          }
        }
        showToast(`Added tag "${issue.tagName}"`);
      } else if (action === 'add_to_playlist') {
        await addTrackToConfiguredPlaylist(issue.playlistId, issue.trackId);
        showToast('Added to TIDAL playlist');
      } else if (action === 'import_and_tag') {
        const tidalTracks = await getTidalTracksByIds([issue.trackId], account.tokenSet.accessToken);
        if (tidalTracks.length > 0) {
          const track = tidalTracks[0];
          const firebaseIds = await saveMusicBatch([track], 0, [issue.tagId], true);
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
              rating: 0,
              releaseDate: track.album.release_date,
              trackPosition: track.track_position || 1,
              diskNumber: track.disk_number || 1,
              savedAt: now,
              firebaseId: firebaseIds[0],
              tags: [issue.tagId],
              ratingHistory: [],
            }]);
            showToast(`Imported '${track.title}' with tag "${issue.tagName}"`);
          }
        } else {
          showToast('Failed to fetch track from TIDAL', 'error');
        }
      } else if (action === 'remove_from_playlist') {
        await removeTrackFromConfiguredPlaylist(issue.playlistId, issue.trackId);
        showToast('Removed from TIDAL playlist');
      }
      setIssues(prev => prev.filter(item => item.trackId !== issue.trackId || item.tagId !== issue.tagId));
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
          if (issue.conflictType === 'missing_tag') {
            const track = useMusicStore.getState().savedMusic.find(m => m.id === issue.trackId);
            if (track && track.firebaseId) {
              await updateSong(track.firebaseId, { tags: [...(track.tags || []), issue.tagId] });
            }
          } else if (issue.conflictType === 'not_in_playlist') {
            await addTrackToConfiguredPlaylist(issue.playlistId, issue.trackId);
          } else if (issue.conflictType === 'missing_from_app') {
            const tidalTracks = await getTidalTracksByIds([issue.trackId], account.tokenSet.accessToken, undefined, true);
            if (tidalTracks.length > 0) {
              const track = tidalTracks[0];
              const firebaseIds = await saveMusicBatch([track], 0, [issue.tagId], true);
              if (firebaseIds[0]) {
                const now = new Date();
                useMusicStore.getState().addMusicBatch([{
                  id: track.id, title: track.title, artist: track.artist.name,
                  artistId: track.artist.id, album: track.album.title, albumId: track.album.id,
                  coverUrl: track.album.cover || track.album.cover_medium || track.album.cover_small || '',
                  duration: track.duration, rating: 0, releaseDate: track.album.release_date,
                  trackPosition: track.track_position || 1, diskNumber: track.disk_number || 1,
                  savedAt: now, firebaseId: firebaseIds[0], tags: [issue.tagId], ratingHistory: [],
                }]);
              }
            }
          }
          resolved++;
          setIssues(prev => prev.filter(i => i.trackId !== issue.trackId || i.tagId !== issue.tagId));
        } catch (err) {
          showToast(`Failed: ${err instanceof Error ? err.message : err}`, 'error');
        }
      }
      if (resolved > 0) showToast(`Synced ${resolved} conflict(s)`);
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
        if (issue.conflictType === 'missing_tag') {
          const track = useMusicStore.getState().savedMusic.find(m => m.id === issue.trackId);
          if (track && track.firebaseId) {
            await updateSong(track.firebaseId, { tags: [...(track.tags || []), issue.tagId] });
          }
        } else if (issue.conflictType === 'not_in_playlist') {
          const track = useMusicStore.getState().savedMusic.find(m => m.id === issue.trackId);
          if (track && track.firebaseId) {
            const newTags = (track.tags || []).filter(t => t !== issue.tagId);
            await updateSong(track.firebaseId, { tags: newTags });
          }
        } else if (issue.conflictType === 'missing_from_app') {
          const account = await refreshTidalConnectionIfNeeded();
          if (account.connected && account.tokenSet?.accessToken) {
            const tidalTracks = await getTidalTracksByIds([issue.trackId], account.tokenSet.accessToken, undefined, true);
            if (tidalTracks.length > 0) {
              const track = tidalTracks[0];
              const firebaseIds = await saveMusicBatch([track], 0, [issue.tagId], true);
              if (firebaseIds[0]) {
                const now = new Date();
                useMusicStore.getState().addMusicBatch([{
                  id: track.id, title: track.title, artist: track.artist.name,
                  artistId: track.artist.id, album: track.album.title, albumId: track.album.id,
                  coverUrl: track.album.cover || track.album.cover_medium || track.album.cover_small || '',
                  duration: track.duration, rating: 0, releaseDate: track.album.release_date,
                  trackPosition: track.track_position || 1, diskNumber: track.disk_number || 1,
                  savedAt: now, firebaseId: firebaseIds[0], tags: [issue.tagId], ratingHistory: [],
                }]);
              }
            }
          }
        }
        resolved++;
        setIssues(prev => prev.filter(i => i.trackId !== issue.trackId || i.tagId !== issue.tagId));
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
        if (issue.conflictType === 'missing_tag') {
          await removeTrackFromConfiguredPlaylist(issue.playlistId, issue.trackId);
        } else if (issue.conflictType === 'not_in_playlist') {
          await addTrackToConfiguredPlaylist(issue.playlistId, issue.trackId);
        } else if (issue.conflictType === 'missing_from_app') {
          await removeTrackFromConfiguredPlaylist(issue.playlistId, issue.trackId);
        }
        resolved++;
        setIssues(prev => prev.filter(i => i.trackId !== issue.trackId || i.tagId !== issue.tagId));
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
      items.push({ id: 'loading', type: 'empty', section: 'playlists', data: { message: 'Loading tag playlists...' } });
      return items;
    }

    if (error) {
      items.push({ id: 'error', type: 'empty', section: 'playlists', data: { message: error, isError: true } });
      return items;
    }

    if (playlists.length === 0) {
      items.push({ id: 'empty', type: 'empty', section: 'playlists', data: { message: 'No tags with TIDAL playlists found.\nConfigure them in Tags > gear icon first.' } });
      return items;
    }

    items.push({
      id: 'header-playlists',
      type: 'header',
      section: 'playlists',
      sticky: true,
      data: { title: 'Sync Tags with TIDAL', showSelectAll: true },
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
      items.push({ id: 'scan-status', type: 'status', section: 'playlists', data: { message: scanStatus } });
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
        items.push({ id: 'bulk-progress', type: 'status', section: 'issues', data: { message: bulkProgress } });
      }

      issues.forEach((issue, index) => {
        items.push({
          id: `issue-${issue.trackId}-${issue.tagId}-${index}`,
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
        data: { message: 'No conflicts found\nYour library tags match the selected TIDAL playlists.' },
      });
    }

    return items;
  }, [loading, error, playlists, selectedPlaylistIds, scanLoading, scanStatus, issues, resolvingTrackIds, handleScan]);

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
                    <TouchableOpacity onPress={() => Alert.alert('From Library', 'Overwrite TIDAL playlists to match library tags?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Sync', onPress: syncFromLibrary }])} disabled={bulkResolving} style={styles.syncButtonLibrary}>
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
            <PlaylistCard playlist={left} selected={selectedPlaylistIds.has(left.playlistId)} onPress={() => togglePlaylist(left.playlistId)} lastSyncedAt={lastSyncedMap.get(left.playlistId)} />
            {right && <PlaylistCard playlist={right} selected={selectedPlaylistIds.has(right.playlistId)} onPress={() => togglePlaylist(right.playlistId)} lastSyncedAt={lastSyncedMap.get(right.playlistId)} />}
          </View>
        );
      }

      case 'issue': {
        const { issue, busy } = data;
        const isMissing = issue.conflictType === 'missing_from_app';
        const missingTrack = isMissing ? missingTracksMap.get(issue.trackId) : undefined;
        const trackTitle = missingTrack?.title || issue.trackTitle || issue.trackId;
        const artistName = missingTrack?.artist?.name || issue.artist || 'Unknown artist';
        const coverUrl = missingTrack?.album?.cover || missingTrack?.album?.cover_medium || missingTrack?.album?.cover_small || '';

        return (
          <View style={styles.issueItem}>
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
                <Text style={styles.issueSubtitle} numberOfLines={2}>{artistName}</Text>
              </>
            )}
            <Text style={styles.issueType}>
              Tag: {issue.tagName} — {issue.conflictType === 'missing_tag' ? 'Track missing this tag.' : issue.conflictType === 'not_in_playlist' ? 'Track not in TIDAL playlist.' : 'Track not in library.'}
            </Text>
            <View style={styles.issueActions}>
              {issue.conflictType === 'missing_tag' && (
                <TouchableOpacity onPress={() => resolveIssue(issue, 'add_tag')} disabled={busy} style={[styles.issueActionButton, styles.issueActionButtonPrimary]}>
                  <Text style={styles.issueActionButtonText}>{busy ? 'Working...' : `Add tag "${issue.tagName}"`}</Text>
                </TouchableOpacity>
              )}
              {issue.conflictType === 'not_in_playlist' && (
                <TouchableOpacity onPress={() => resolveIssue(issue, 'add_to_playlist')} disabled={busy} style={[styles.issueActionButton, styles.issueActionButtonPrimary]}>
                  <Text style={styles.issueActionButtonText}>{busy ? 'Working...' : 'Add to TIDAL playlist'}</Text>
                </TouchableOpacity>
              )}
              {issue.conflictType === 'missing_from_app' && (
                <TouchableOpacity onPress={() => resolveIssue(issue, 'import_and_tag')} disabled={busy} style={[styles.issueActionButton, styles.issueActionButtonPrimary]}>
                  <Text style={styles.issueActionButtonText}>{busy ? 'Working...' : 'Import with tag'}</Text>
                </TouchableOpacity>
              )}
              {issue.conflictType !== 'missing_from_app' && (
                <TouchableOpacity onPress={() => resolveIssue(issue, 'remove_from_playlist')} disabled={busy} style={[styles.issueActionButton, styles.issueActionButtonRemove]}>
                  <Text style={styles.issueActionButtonText}>{busy ? 'Working...' : 'Remove from playlist'}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        );
      }

      case 'action':
        return (
          <TouchableOpacity onPress={data.onPress} disabled={data.disabled} style={[styles.actionButton, data.loading && { opacity: 0.7 }]}>
            {data.loading ? (
              <ActivityIndicator color={theme.colors.text.primary} />
            ) : (
              <Text style={styles.actionButtonText}>{data.label}</Text>
            )}
          </TouchableOpacity>
        );

      case 'status':
        return <Text style={[styles.statusText, data.isError && styles.errorText]}>{data.message}</Text>;

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
            stickyHeaderIndices={listData.map((item, index) => item.sticky ? index : -1).filter(i => i !== -1)}
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
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 16 },
  modalContent: { flex: 1, backgroundColor: theme.colors.background.amoled, borderRadius: theme.borderRadius.lg, borderColor: theme.colors.border, borderWidth: 1, maxHeight: '95%', overflow: 'hidden' },
  closeButton: { paddingVertical: 14, borderTopWidth: 1, borderTopColor: theme.colors.divider, alignItems: 'center' },
  closeButtonText: { color: theme.colors.text.primary, fontSize: theme.sizes.body, fontWeight: theme.weights.bold },
  stickyHeader: { backgroundColor: theme.colors.background.amoled, borderBottomWidth: 1, borderBottomColor: theme.colors.divider, paddingHorizontal: 16, paddingVertical: 10, zIndex: 10 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  syncButtonRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  syncRightButtons: { flexDirection: 'row', gap: 8 },
  sectionTitle: { fontSize: theme.sizes.medium, color: theme.colors.text.primary, fontWeight: theme.weights.bold },
  headerButtons: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  syncAllButton: { paddingVertical: 4, paddingHorizontal: 10, backgroundColor: theme.colors.button.primary, borderRadius: theme.borderRadius.sm },
  syncButtonTidal: { paddingVertical: 4, paddingHorizontal: 10, backgroundColor: '#2b5a2b', borderRadius: theme.borderRadius.sm },
  syncButtonLibrary: { paddingVertical: 4, paddingHorizontal: 10, backgroundColor: '#5a2b5a', borderRadius: theme.borderRadius.sm },
  syncAllText: { color: theme.colors.text.primary, fontSize: theme.sizes.small, fontWeight: theme.weights.bold },
  selectAllButton: { paddingVertical: 4, paddingHorizontal: 8 },
  selectAllText: { color: theme.colors.text.blue, fontSize: theme.sizes.small, fontWeight: theme.weights.medium },
  playlistPairRow: { flexDirection: 'row', paddingHorizontal: 12, gap: 10, marginTop: 8 },
  playlistCard: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: theme.colors.background.surface, borderRadius: theme.borderRadius.md, borderWidth: 1, borderColor: theme.colors.border },
  playlistCardSelected: { borderColor: theme.colors.button.primary, backgroundColor: '#001a3a' },
  checkmark: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: theme.colors.border, alignItems: 'center', justifyContent: 'center' },
  checkmarkSelected: { backgroundColor: theme.colors.button.primary, borderColor: theme.colors.button.primary },
  playlistCardTitle: { color: theme.colors.text.primary, fontSize: theme.sizes.body, fontWeight: theme.weights.bold },
  playlistCardTitleSelected: { color: theme.colors.text.primary },
  playlistCardTimestamp: { marginTop: 2, color: theme.colors.text.muted, fontSize: theme.sizes.xsmall },
  actionButton: { backgroundColor: theme.colors.button.primary, paddingVertical: 12, paddingHorizontal: 16, borderRadius: theme.borderRadius.md, alignItems: 'center', minHeight: 48, justifyContent: 'center', marginHorizontal: 16, marginTop: 16 },
  actionButtonText: { color: theme.colors.text.primary, fontWeight: theme.weights.bold, fontSize: theme.sizes.body },
  statusText: { marginTop: 8, marginHorizontal: 16, color: theme.colors.text.secondary, fontSize: theme.sizes.small, textAlign: 'center' },
  emptyContainer: { padding: 32, alignItems: 'center' },
  emptyText: { color: theme.colors.text.secondary, fontSize: theme.sizes.body, textAlign: 'center' },
  errorText: { color: theme.colors.text.error },
  issueItem: { marginHorizontal: 16, marginTop: 16, padding: 12, backgroundColor: theme.colors.background.surface, borderRadius: theme.borderRadius.md, borderWidth: 1, borderColor: theme.colors.border },
  missingTrackRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 10 },
  missingTrackCover: { width: 48, height: 48, borderRadius: theme.borderRadius.sm },
  missingTrackCoverPlaceholder: { backgroundColor: theme.colors.background.surface, borderWidth: 1, borderColor: theme.colors.border, alignItems: 'center', justifyContent: 'center' },
  missingTrackInfo: { flex: 1 },
  issueTitle: { color: theme.colors.text.primary, fontSize: theme.sizes.body, fontWeight: theme.weights.semibold },
  issueSubtitle: { marginTop: 4, color: theme.colors.text.secondary, fontSize: theme.sizes.small },
  issueType: { marginTop: 4, color: theme.colors.text.muted, fontSize: theme.sizes.xsmall },
  issueActions: { flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  issueActionButton: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: theme.borderRadius.sm, minWidth: 120, alignItems: 'center' },
  issueActionButtonPrimary: { backgroundColor: theme.colors.button.primary },
  issueActionButtonRemove: { backgroundColor: theme.colors.button.delete },
  issueActionButtonText: { color: theme.colors.text.primary, fontWeight: theme.weights.bold, fontSize: theme.sizes.small },
});
