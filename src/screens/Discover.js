import React, { useState, useCallback, useRef } from 'react';
import { View, Text, FlatList, Alert } from 'react-native';
import SearchBarAdv from '../components/SearchBarAdv';
import DiscoverSongCard from '../components/DiscoverSongCard';
import { fetchAlbumCoverByMbid, searchRecordings } from '../api/MusicBrainzAPI';
import { discoverScreenStyles as styles } from '../styles/screenStyles';

const Discover = () => {
    const [searchParams, setSearchParams] = useState({ songTitle: '', artist: '', album: '', year: '' });
    const [searchResults, setSearchResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const activeSearchRef = useRef(null);

    const handleSearch = useCallback(async () => {
        setLoading(true);
        const currentSearchId = Date.now();
        activeSearchRef.current = currentSearchId;
    
        const { title, artist, album, year } = searchParams;
        const queryParts = [];
        if (title) queryParts.push(`title:"${encodeURIComponent(title)}"`);
        if (artist) queryParts.push(`artist:"${encodeURIComponent(artist)}"`);
        if (album) queryParts.push(`release:"${encodeURIComponent(album)}"`);
        if (year) queryParts.push(`date:${encodeURIComponent(year)}`);
        const query = queryParts.join(' AND ');
    
        try {
            const data = await searchRecordings(query);
            const recordings = data.recordings || [];
    
            const initialResults = recordings.map(recording => {
                if (!recording || !recording['artist-credit'] || !recording.releases) {
                    return null;
                }
                const releaseGroupTypes = recording.releases[0]['release-group']['primary-type'];
                if (!['Album', 'Single', 'EP'].includes(releaseGroupTypes)) {
                    return null;
                }
                return { ...recording, coverPath: null, noCover: false };
            }).filter(recording => recording !== null);
    
            const sortedResults = initialResults.sort((a, b) => {
                const dateA = new Date(a.releases?.[0]?.date || '1900-01-01');
                const dateB = new Date(b.releases?.[0]?.date || '1900-01-01');
                if (dateB - dateA !== 0) {
                    return dateB - dateA;
                }
                const trackNumberA = parseInt(a.releases?.[0]?.media?.[0]?.track?.[0]?.number || '0', 10);
                const trackNumberB = parseInt(b.releases?.[0]?.media?.[0]?.track?.[0]?.number || '0', 10);
                return trackNumberA - trackNumberB;
            });
    
            setSearchResults(sortedResults);
    
            sortedResults.forEach(async (recording, index) => {
                if (activeSearchRef.current !== currentSearchId) return;
                if (!recording || !recording['artist-credit'] || !recording.releases) return;
                const artistName = recording['artist-credit'][0].name;
                const albumTitle = recording.releases[0].title;
                const coverPath = await fetchAlbumCoverByMbid(recording.releases, artistName, albumTitle);
                setSearchResults(prevResults => {
                    if (activeSearchRef.current !== currentSearchId) return prevResults;
                    const newResults = [...prevResults];
                    if (newResults[index]) {
                        newResults[index].coverPath = coverPath !== 'NO_COVER_FOUND' ? coverPath : null;
                        newResults[index].noCover = coverPath === 'NO_COVER_FOUND';
                    }
                    return newResults;
                });
            });
        } catch (error) {
            if (activeSearchRef.current === currentSearchId) {
                console.error('Error fetching search results:', error);
                Alert.alert('Error', `Failed to fetch search results: ${error.message}`);
            }
        } finally {
            if (activeSearchRef.current === currentSearchId) {
                setLoading(false);
            }
        }
    }, [searchParams]);

    const keyExtractor = useCallback((item) => item.id, []);

    return (
        <View style={styles.container}>
            <SearchBarAdv searchParams={searchParams} setSearchParams={setSearchParams} handleSearch={handleSearch} />
            {loading ? (
                <Text style={styles.loadingText}>Loading...</Text>
            ) : searchResults.length === 0 ? (
                <Text style={styles.noResultsText}>No results found for this search.</Text>
            ) : (
                <FlatList
                    data={searchResults}
                    keyExtractor={keyExtractor}
                    renderItem={({ item }) => <DiscoverSongCard item={item}/> }
                    contentContainerStyle={styles.listContainer}
                />
            )}
        </View>
    );
};

export default Discover;