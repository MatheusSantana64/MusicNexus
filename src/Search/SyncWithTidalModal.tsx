import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Modal, View, Text, TouchableOpacity, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import { MusicTrack, SavedMusic } from '../types';
import { FlashList } from '@shopify/flash-list';
import { MusicItem } from '../components/MusicItem';
import { useMusicStore } from '../store/musicStore';
import { refreshTidalConnectionIfNeeded, fetchTidalPlaylistItems, addTrackToConfiguredPlaylist, removeTrackFromConfiguredPlaylist, TidalPlaylistSyncIssue, reconcileTidalRatingPlaylists } from '../services/tidal/tidalAccountService';
import { getTidalTracksByIds } from '../services/tidal/tidalApiClient';
import { saveMusicBatch } from '../services/music/musicService';
import { showToast } from '../utils/toast';
import { formatDateTimeDDMMYY_HHMM } from '../utils/dateUtils';

type SyncMode = 'import' | 'compare';

interface PlaylistOption {
  rating: string;
  playlistId: string;
  title: string;
  trackCount?: number;
}

type SectionType = 'playlists' | 'import' | 'preview' | 'compare' | 'issues';

interface ListItem {
  id: string;
  type: 'header' | 'playlist' | 'track' | 'issue' | 'action' | 'status' | 'empty' | 'modeSelector';
  section: SectionType;
  data?: any;
  sticky?: boolean;
}

function savedMusicToTrack(music: SavedMusic): MusicTrack {
  return {
    id: music.id,
    title: music.title,
    title_short: music.title,
    artist: { id: music.artistId, name: music.artist, picture: '', picture_small: '', picture_medium: '' },
    album: { id: music.albumId, title: music.album, cover: music.coverUrl, cover_small: music.coverUrl, cover_medium: music.coverUrl, cover_big: music.coverUrl, release_date: music.releaseDate },
    duration: music.duration,
    rank: 0,
    track_position: music.trackPosition,
    disk_number: music.diskNumber,
    release_date: music.releaseDate,
  };
}

interface SyncWithTidalModalProps {
  visible: boolean;
  onClose: () => void;
}

export function SyncWithTidalModal({ visible, onClose }: SyncWithTidalModalProps) {
  const [mode, setMode] = useState<SyncMode>('import');
  const [playlists, setPlaylists] = useState<PlaylistOption[]>([]);
  const [selectedPlaylistIds, setSelectedPlaylistIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Import mode state
  const [previewTracks, setPreviewTracks] = useState<MusicTrack[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [existingCount, setExistingCount] = useState(0);
  const [status, setStatus] = useState<string | null>(null);

  // Compare mode state
  const [issues, setIssues] = useState<TidalPlaylistSyncIssue[]>([]);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanStatus, setScanStatus] = useState<string>('Idle');
  const [resolvingTrackIds, setResolvingTrackIds] = useState<Set<string>>(new Set());

  const savedMusic = useMusicStore(state => state.savedMusic);
  const updateRating = useMusicStore(state => state.updateRating);

  useEffect(() => {
    if (!visible) return;
    setPlaylists([]);
    setSelectedPlaylistIds(new Set());
    setPreviewTracks([]);
    setPreviewError(null);
    setImportLoading(false);
    setIssues([]);
    setScanLoading(false);
    setScanStatus('Idle');
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

  const handlePreview = async () => {
    if (selectedPlaylistIds.size === 0) {
      Alert.alert('No playlists selected', 'Please select at least one playlist to preview.');
      return;
    }
    setPreviewLoading(true);
    setPreviewError(null);
    setPreviewTracks([]);
    setExistingCount(0);
    setStatus('Fetching playlist items...');
    try {
      const account = await refreshTidalConnectionIfNeeded(undefined, { skipPlaylistRefresh: true });
      if (!account.connected || !account.tokenSet?.accessToken) throw new Error('TIDAL not connected');
      const token = account.tokenSet.accessToken;

      const existingIds = new Set(savedMusic.map(m => m.id));
      let allTrackIds: string[] = [];
      let totalItems = 0;

      for (const playlistId of selectedPlaylistIds) {
        const items = await fetchTidalPlaylistItems(playlistId, token);
        const ids = items.map(item => String(item.id || '')).filter(Boolean);
        totalItems += ids.length;
        const newIds = ids.filter(id => !existingIds.has(id));
        allTrackIds = allTrackIds.concat(newIds);
      }

      setExistingCount(totalItems - allTrackIds.length);

      if (allTrackIds.length === 0) {
        setPreviewTracks([]);
        setStatus('All tracks already in library');
        return;
      }

      setStatus(`Resolving ${allTrackIds.length} track(s)...`);
      const tracks = await getTidalTracksByIds(allTrackIds, token, (msg) => setStatus(msg), true);
      setPreviewTracks(tracks);
      setStatus(`${tracks.length} new track(s) to import`);
    } catch (error) {
      console.error('[SyncWithTidalModal] Preview error:', error);
      setPreviewError(error instanceof Error ? error.message : 'Failed to preview tracks');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleImport = async () => {
    if (previewTracks.length === 0) {
      Alert.alert('Nothing to import', 'No new tracks to import.');
      return;
    }
    setImportLoading(true);
    setStatus('Saving tracks...');
    try {
      const existingIds = new Set(savedMusic.map(m => m.id));
      const tracksToSave = previewTracks.filter(t => !existingIds.has(t.id));
      const ratings = Array.from(selectedPlaylistIds).flatMap(playlistId => {
        const pl = playlists.find(p => p.playlistId === playlistId);
        return pl ? [Number(pl.rating)] : [];
      });
      const rating = ratings[0] || 0;

      const firebaseIds = await saveMusicBatch(tracksToSave, rating, [], true);
      const now = new Date();
      const savedMusics = tracksToSave.map((track, idx) => ({
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
      setPreviewTracks([]);
      setStatus('');
      showToast(`Imported ${savedMusics.length} track(s)`, 'success');
    } catch (error) {
      console.error('[SyncWithTidalModal] Import error:', error);
      showToast(error instanceof Error ? error.message : 'Import failed', 'error');
    } finally {
      setImportLoading(false);
    }
  };

  const handleScan = async () => {
    if (selectedPlaylistIds.size === 0) {
      Alert.alert('No playlists selected', 'Please select at least one playlist to scan.');
      return;
    }
    setScanLoading(true);
    setIssues([]);
    setScanStatus('Scanning...');
    try {
      const account = await refreshTidalConnectionIfNeeded();
      if (!account.connected || !account.tokenSet?.accessToken) throw new Error('TIDAL not connected');

      let allIssues: TidalPlaylistSyncIssue[] = [];
      let scannedCount = 0;
      const selectedPlaylistEntries = Object.entries(account.ratingPlaylists || {})
        .filter(([, id]) => selectedPlaylistIds.has(id));

      for (const [rating, playlistId] of selectedPlaylistEntries) {
        setScanStatus(`Scanning rating ${rating}... (${scannedCount + 1}/${selectedPlaylistEntries.length})`);
        const result = await reconcileTidalRatingPlaylists(
          savedMusic.map(m => ({
            id: m.id,
            title: m.title,
            artist: m.artist,
            rating: m.rating,
            savedAt: m.savedAt,
            ratingHistory: m.ratingHistory,
          })),
          playlistId
        );
        allIssues = allIssues.concat(result.issues);
        scannedCount++;
      }
      setIssues(allIssues);
      setScanStatus(allIssues.length > 0
        ? `Found ${allIssues.length} conflict(s)`
        : 'No conflicts found');
    } catch (error) {
      console.error('[SyncWithTidalModal] Scan error:', error);
      setScanStatus('Scan failed');
      showToast(error instanceof Error ? error.message : 'Scan failed', 'error');
    } finally {
      setScanLoading(false);
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
      const account = await refreshTidalConnectionIfNeeded();
      if (!account.connected || !account.tokenSet?.accessToken) throw new Error('TIDAL not connected');

      if (keep === 'library') {
        const keepRatingPlaylistId = account.ratingPlaylists?.[Number(track.rating).toFixed(1)];
        for (const playlistId of issue.playlistIds) {
          await removeTrackFromConfiguredPlaylist(playlistId, issue.trackId);
        }
        if (keepRatingPlaylistId && Number(track.rating) > 0) {
          await addTrackToConfiguredPlaylist(keepRatingPlaylistId, issue.trackId);
        }
        showToast('Kept library rating, updated TIDAL');
      } else if (keep === 'playlist' && selectedPlaylistId) {
        for (const playlistId of issue.playlistIds) {
          if (playlistId !== selectedPlaylistId) {
            await removeTrackFromConfiguredPlaylist(playlistId, issue.trackId);
          }
        }
        const selectedRating = Number(
          Object.entries(account.ratingPlaylists || {}).find(([, id]) => id === selectedPlaylistId)?.[0] || track.rating
        );
        if (track.firebaseId) {
          await updateRating(track.firebaseId, selectedRating);
        }
        await addTrackToConfiguredPlaylist(selectedPlaylistId, issue.trackId);
        showToast('Kept TIDAL playlist version');
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

  // Build unified list data for FlashList
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

    // Mode selector
    items.push({
      id: 'mode-selector',
      type: 'modeSelector',
      section: 'playlists',
      data: { mode },
    });

    // Playlists section
    items.push({
      id: 'header-playlists',
      type: 'header',
      section: 'playlists',
      sticky: true,
      data: { title: 'Select playlists', showSelectAll: true },
    });

    playlists.forEach(pl => {
      items.push({
        id: `playlist-${pl.playlistId}`,
        type: 'playlist',
        section: 'playlists',
        data: { playlist: pl, selected: selectedPlaylistIds.has(pl.playlistId) },
      });
    });

    items.push({
      id: 'selection-summary',
      type: 'status',
      section: 'playlists',
      data: { message: `${selectedPlaylistIds.size} of ${playlists.length} playlist(s) selected` },
    });

    // Mode-specific sections
    if (mode === 'import') {
      items.push({
        id: 'header-import',
        type: 'header',
        section: 'import',
        sticky: true,
        data: { title: 'Import songs' },
      });

      // Preview action
      items.push({
        id: 'action-preview',
        type: 'action',
        section: 'import',
        data: {
          label: previewLoading ? 'Loading...' : 'Preview import',
          onPress: handlePreview,
          disabled: previewLoading || selectedPlaylistIds.size === 0,
          loading: previewLoading,
        },
      });

      if (previewError) {
        items.push({
          id: 'preview-error',
          type: 'status',
          section: 'import',
          data: { message: previewError, isError: true },
        });
      }

      if (status && !previewLoading) {
        items.push({
          id: 'preview-status',
          type: 'status',
          section: 'import',
          data: { message: status },
        });
      }

      if (existingCount > 0) {
        items.push({
          id: 'existing-count',
          type: 'status',
          section: 'import',
          data: { message: `${existingCount} track(s) already in library`, muted: true },
        });
      }

      // Preview tracks
      if (previewTracks.length > 0) {
        items.push({
          id: 'header-preview',
          type: 'header',
          section: 'preview',
          sticky: true,
          data: { title: `Preview (${previewTracks.length} tracks)` },
        });

        previewTracks.forEach(track => {
          items.push({
            id: `track-${track.id}`,
            type: 'track',
            section: 'preview',
            data: { track },
          });
        });

        items.push({
          id: 'action-import',
          type: 'action',
          section: 'preview',
          data: {
            label: importLoading ? 'Importing...' : `Import ${previewTracks.length} track(s)`,
            onPress: handleImport,
            disabled: importLoading,
            loading: importLoading,
            primary: true,
          },
        });

        if (status && !importLoading && !previewLoading) {
          items.push({
            id: 'import-status',
            type: 'status',
            section: 'preview',
            data: { message: status },
          });
        }
      }
    } else if (mode === 'compare') {
      items.push({
        id: 'header-compare',
        type: 'header',
        section: 'compare',
        sticky: true,
        data: { title: 'Compare ratings' },
      });

      items.push({
        id: 'action-scan',
        type: 'action',
        section: 'compare',
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
          section: 'compare',
          data: { message: scanStatus },
        });
      }

      if (issues.length > 0) {
        items.push({
          id: 'header-issues',
          type: 'header',
          section: 'issues',
          sticky: true,
          data: { title: `Conflicts (${issues.length})` },
        });

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
    }

    return items;
  }, [
    loading, error, playlists, selectedPlaylistIds, mode,
    previewLoading, previewError, previewTracks, existingCount, status, importLoading,
    scanLoading, scanStatus, issues, resolvingTrackIds,
    handlePreview, handleImport, handleScan,
  ]);

  const getItemType = useCallback((item: ListItem) => item.type, []);

  const renderItem = useCallback(({ item }: { item: ListItem }) => {
    const { type, data, section } = item;

    switch (type) {
      case 'modeSelector':
        return (
          <View style={styles.modeSelector}>
            <TouchableOpacity
              onPress={() => { setMode('import'); setSelectedPlaylistIds(new Set()); setPreviewTracks([]); setIssues([]); }}
              style={[styles.modeButton, data.mode === 'import' && styles.modeButtonActive]}
            >
              <Text style={[styles.modeButtonText, data.mode === 'import' && styles.modeButtonTextActive]}>Import songs</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => { setMode('compare'); setSelectedPlaylistIds(new Set()); setPreviewTracks([]); setIssues([]); }}
              style={[styles.modeButton, data.mode === 'compare' && styles.modeButtonActive]}
            >
              <Text style={[styles.modeButtonText, data.mode === 'compare' && styles.modeButtonTextActive]}>Compare ratings</Text>
            </TouchableOpacity>
          </View>
        );

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
          </View>
        );

      case 'playlist': {
        const { playlist, selected } = data;
        return (
          <TouchableOpacity
            style={[styles.playlistItem, selected && styles.playlistItemSelected]}
            onPress={() => togglePlaylist(playlist.playlistId)}
          >
            <View style={styles.playlistItemLeft}>
              <View style={[styles.checkmark, selected && styles.checkmarkSelected]} />
              <Text style={[styles.playlistTitle, selected && styles.playlistTitleSelected]}>{playlist.title}</Text>
            </View>
            <View style={styles.playlistItemRight}>
              <Text style={styles.playlistRating}>Rating: {playlist.rating}</Text>
              {playlist.trackCount && <Text style={styles.playlistTrackCount}>{playlist.trackCount} tracks</Text>}
            </View>
          </TouchableOpacity>
        );
      }

      case 'track': {
        const { track } = data;
        return (
          <MusicItem
            music={savedMusicToTrack({ ...track, artist: track.artist.name, artistId: track.artist.id, album: track.album.title, albumId: track.album.id, coverUrl: track.album.cover || '', duration: track.duration, trackPosition: track.track_position || 0, diskNumber: track.disk_number || 1, releaseDate: track.album.release_date, rating: 0, savedAt: new Date(), firebaseId: '', tags: [], ratingHistory: [] } as SavedMusic)}
            onPress={() => {}}
            isLoading={false}
            showInfoModal={() => {}}
          />
        );
      }

      case 'issue': {
        const { issue, busy } = data;
        const isDuplicate = issue.conflictType === 'duplicate';
        const libraryAt = issue.libraryTimestamp ? Date.parse(issue.libraryTimestamp) : 0;
        const newestPlaylistAt = Math.max(...(issue.playlistDetails || []).map((d: { addedAt?: string }) => Date.parse(d.addedAt || '')).filter(Number.isFinite), 0);
        const newestSource = libraryAt >= newestPlaylistAt ? 'library' : 'playlist';

        return (
          <View style={styles.issueItem} key={issue.trackId + issue.conflictType}>
            <Text style={styles.issueTitle} numberOfLines={2}>{issue.trackTitle || issue.trackId}</Text>
            <Text style={styles.issueSubtitle} numberOfLines={2}>
              {issue.artist || 'Unknown artist'} — library {issue.libraryRating ?? 'n/a'} — playlists {issue.playlistRatings.join(', ')}
            </Text>
            <View style={styles.timestampRow}>
              <Text style={[styles.timestamp, newestSource === 'library' && styles.timestampHighlight]}>
                Library: {issue.libraryTimestamp ? formatDateTimeDDMMYY_HHMM(issue.libraryTimestamp) : 'unknown'}
              </Text>
              {(issue.playlistDetails || []).map((detail: { playlistId: string; rating: string; addedAt?: string }) => (
                <Text
                  key={detail.playlistId}
                  style={[styles.timestamp, detail.addedAt && Date.parse(detail.addedAt) === newestPlaylistAt && newestSource === 'playlist' && styles.timestampHighlight]}
                >
                  Playlist {detail.rating}: {detail.addedAt ? formatDateTimeDDMMYY_HHMM(detail.addedAt) : 'unknown'}
                </Text>
              ))}
            </View>
            <Text style={styles.issueType}>{isDuplicate ? 'Song is on multiple playlists.' : 'Song is on a different rating playlist than your library rating.'}</Text>
            <View style={styles.issueActions}>
              <TouchableOpacity
                onPress={() => resolveIssue(issue, 'library')}
                disabled={busy}
                style={[styles.issueActionButton, styles.issueActionButtonLibrary]}
              >
                <Text style={styles.issueActionButtonText}>{busy ? 'Working...' : 'Keep library'}</Text>
              </TouchableOpacity>
              {issue.playlistIds.map((playlistId: string, index: number) => (
                <TouchableOpacity
                  key={playlistId}
                  onPress={() => resolveIssue(issue, 'playlist', playlistId)}
                  disabled={busy}
                  style={[styles.issueActionButton, styles.issueActionButtonPlaylist]}
                >
                  <Text style={styles.issueActionButtonText}>Keep playlist {issue.playlistRatings[index]}</Text>
                </TouchableOpacity>
              ))}
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
  }, [playlists, selectedPlaylistIds, toggleAllPlaylists, resolveIssue]);

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
  },
  modalContent: {
    flex: 1,
    backgroundColor: theme.colors.background.amoled,
    borderTopLeftRadius: theme.borderRadius.lg,
    borderTopRightRadius: theme.borderRadius.lg,
    borderColor: theme.colors.border,
    borderWidth: 1,
    maxHeight: '90%',
    width: '100%',
    overflow: 'hidden',
  },
  stickyHeader: {
    backgroundColor: theme.colors.background.amoled,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
    paddingHorizontal: 16,
    paddingVertical: 8,
    zIndex: 10,
  },
  modeSelector: {
    flexDirection: 'row',
    margin: 16,
    backgroundColor: theme.colors.background.surface,
    borderRadius: theme.borderRadius.md,
    padding: 4,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: theme.borderRadius.sm,
    alignItems: 'center',
  },
  modeButtonActive: {
    backgroundColor: theme.colors.button.primary,
  },
  modeButtonText: {
    color: theme.colors.text.secondary,
    fontWeight: theme.weights.semibold,
  },
  modeButtonTextActive: {
    color: theme.colors.text.primary,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
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
  selectAllText: {
    color: theme.colors.text.blue,
    fontSize: theme.sizes.small,
    fontWeight: theme.weights.medium,
  },
  playlistItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: theme.colors.background.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  playlistItemSelected: {
    borderColor: theme.colors.button.primary,
    backgroundColor: '#001a3a',
  },
  playlistItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkmark: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkSelected: {
    backgroundColor: theme.colors.button.primary,
    borderColor: theme.colors.button.primary,
  },
  playlistTitle: {
    color: theme.colors.text.primary,
    fontSize: theme.sizes.body,
    fontWeight: theme.weights.medium,
  },
  playlistTitleSelected: {
    color: theme.colors.text.primary,
  },
  playlistItemRight: {
    alignItems: 'flex-end',
  },
  playlistRating: {
    color: theme.colors.text.secondary,
    fontSize: theme.sizes.small,
  },
  playlistTrackCount: {
    color: theme.colors.text.muted,
    fontSize: theme.sizes.xsmall,
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
  previewList: {
    maxHeight: 300,
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
  issueActionButtonText: {
    color: theme.colors.text.primary,
    fontWeight: theme.weights.bold,
    fontSize: theme.sizes.small,
  },
  separator: {
    height: 1,
    backgroundColor: theme.colors.divider,
    marginHorizontal: 16,
  },
});