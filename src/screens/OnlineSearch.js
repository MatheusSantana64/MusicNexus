import React, { useState, useCallback, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert, Image } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { insertSongIntoDatabase } from '../database/databaseOperations';
import { globalStyles } from '../styles/global';

const USER_AGENT = 'MusicNexusApp/0.4.3 ( https://github.com/MatheusSantana64/MusicNexus )';

const fetchAlbumCoverByMbid = async (releases, artist, album) => {
    const sizes = ['front-250', 'front-500', 'front'];
    for (const release of releases) {
        const mbid = release.id;
        for (const size of sizes) {
            try {
                const response = await fetch(`https://coverartarchive.org/release/${mbid}/${size}`, {
                    headers: {
                        'User-Agent': USER_AGENT,
                        Accept: 'image/jpeg',
                    },
                });
                if (response.ok) {
                    console.log(`Found cover for MBID ${mbid} with size ${size}`);
                    return response.url || null;
                }
            } catch (error) {
                console.log(`Error fetching cover for MBID ${mbid} with size ${size}:`, error);
            }
        }
    }

    // Search by album-artist combination if no cover found
    try {
        const query = `artist:"${encodeURIComponent(artist)}" AND release:"${encodeURIComponent(album)}"`;
        const response = await fetch(`https://musicbrainz.org/ws/2/release/?query=${query}&fmt=json&limit=5`, {
            headers: {
                'User-Agent': USER_AGENT,
            },
        });
        if (response.ok) {
            const data = await response.json();
            const additionalReleases = data.releases || [];
            for (const release of additionalReleases) {
                for (const size of sizes) {
                    try {
                        const coverResponse = await fetch(`https://coverartarchive.org/release/${release.id}/${size}`, {
                            headers: {
                                'User-Agent': USER_AGENT,
                                Accept: 'image/jpeg',
                            },
                        });
                        if (coverResponse.ok) {
                            console.log(`Found cover for release ${release.id} with size ${size}`);
                            return coverResponse.url || null;
                        }
                    } catch (error) {
                        console.log(`Error fetching cover for release ${release.id} with size ${size}:`, error);
                    }
                }
            }
        }
    } catch (error) {
        console.log(`Error searching for album-artist combination:`, error);
    }

    console.log(`No cover found for album: ${album}, artist: ${artist}`);
    return 'NO_COVER_FOUND';
};

const OnlineSearch = () => {
    const [searchResults, setSearchResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [songTitle, setSongTitle] = useState('');
    const [artist, setArtist] = useState('');
    const [album, setAlbum] = useState('');
    const [year, setYear] = useState('');
    const activeSearchRef = useRef(null);

    const handleSearch = useCallback(async () => {
        setLoading(true);
        const currentSearchId = Date.now();
        activeSearchRef.current = currentSearchId;
    
        const queryParts = [];
        if (songTitle) queryParts.push(`recording:"${encodeURIComponent(songTitle)}"`);
        if (artist) queryParts.push(`artist:"${encodeURIComponent(artist)}"`);
        if (album) queryParts.push(`release:"${encodeURIComponent(album)}"`);
        if (year) queryParts.push(`date:${encodeURIComponent(year)}`);
        const query = queryParts.join(' AND ');
    
        try {
            const response = await fetch(`https://musicbrainz.org/ws/2/recording/?query=${query}&fmt=json&limit=50`, {
                headers: {
                    'User-Agent': USER_AGENT,
                },
            });
            if (!response.ok) {
                throw new Error(`Error fetching data: ${response.statusText}`);
            }
            const data = await response.json();
            const recordings = data.recordings || [];
    
            // Set initial search results without cover images
            const initialResults = recordings.map(recording => {
                if (!recording || !recording['artist-credit'] || !recording.releases) {
                    return null;
                }
                return { ...recording, coverPath: null, noCover: false };
            }).filter(recording => recording !== null);
    
            // Sort initial results by release date (most recent first) and then by track number
            const sortedResults = initialResults.sort((a, b) => {
                const dateA = new Date(a.releases?.[0]?.date || '1900-01-01');
                const dateB = new Date(b.releases?.[0]?.date || '1900-01-01');
                if (dateB - dateA !== 0) {
                    return dateB - dateA; // Most recent first
                }
                const trackNumberA = parseInt(a.releases?.[0]?.media?.[0]?.track?.[0]?.number || '0', 10);
                const trackNumberB = parseInt(b.releases?.[0]?.media?.[0]?.track?.[0]?.number || '0', 10);
                return trackNumberA - trackNumberB; // Ascending track number
            });
    
            setSearchResults(sortedResults);
    
            // Fetch cover images asynchronously
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
    }, [songTitle, artist, album, year]);

    const handleAddSong = useCallback(async (song) => {
        try {
            const artistName = song['artist-credit'][0].name;
            const albumTitle = song.releases[0].title;
            const coverPath = await fetchAlbumCoverByMbid(song.releases, artistName, albumTitle);
            const songData = {
                id: null,
                title: song.title,
                artist: artistName,
                album: albumTitle,
                release: song.releases[0].date || '1900-01-01',
                rating: 0,
                cover_path: coverPath !== 'NO_COVER_FOUND' ? coverPath : null,
            };
            await insertSongIntoDatabase(songData);
            Alert.alert('Success', 'Song added to your library.');
        } catch (error) {
            console.error('Error adding song:', error);
            Alert.alert('Error', 'Failed to add song to your library.');
        }
    }, []);

    const renderItem = ({ item }) => {
        const artistName = item['artist-credit']?.[0]?.name || 'Unknown Artist';
        const albumTitle = item.releases?.[0]?.title || 'Unknown Album';
        const trackNumber = item.releases?.[0]?.media?.[0]?.track?.[0]?.number || 'N/A';
        const releaseDate = item.releases?.[0]?.date || 'Unknown Release Date';
    
        return (
            <View style={styles.songItem}>
                {item.coverPath ? (
                    <Image
                        source={{ uri: item.coverPath }}
                        style={styles.coverImage}
                    />
                ) : (
                    <View style={[styles.coverPlaceholder, item.noCover && styles.noCoverPlaceholder]}>
                        {item.noCover && <Text style={styles.noCoverText}>No cover found</Text>}
                    </View>
                )}
                <View style={styles.songInfo}>
                    <Text style={styles.songTitle}>
                        <Text style={styles.songTrackNumber}>{trackNumber}. </Text>
                    {item.title}</Text>
                    <Text style={styles.songArtist}>{artistName}</Text>
                    <Text style={styles.songAlbum}>{albumTitle}</Text>
                    <Text style={styles.songReleaseDate}>{releaseDate}</Text>
                </View>
                <TouchableOpacity onPress={() => handleAddSong(item)} style={styles.addButton}>
                    <Text style={styles.addButtonText}>Add</Text>
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.searchBarContainer}>
                <View style={styles.inputContainer}>
                    <TextInput
                        placeholder="Song Title"
                        placeholderTextColor='grey'
                        style={styles.input}
                        value={songTitle}
                        onChangeText={setSongTitle}
                    />
                    {songTitle ? (
                        <TouchableOpacity onPress={() => setSongTitle('')} style={styles.clearButton}>
                            <Icon name="x" size={24} color="white" />
                        </TouchableOpacity>
                    ) : null}
                </View>
                <View style={styles.inputContainer}>
                    <TextInput
                        placeholder="Artist"
                        placeholderTextColor='grey'
                        style={styles.input}
                        value={artist}
                        onChangeText={setArtist}
                    />
                    {artist ? (
                        <TouchableOpacity onPress={() => setArtist('')} style={styles.clearButton}>
                            <Icon name="x" size={24} color="white" />
                        </TouchableOpacity>
                    ) : null}
                </View>
                <View style={styles.inputContainer}>
                    <TextInput
                        placeholder="Album"
                        placeholderTextColor='grey'
                        style={styles.input}
                        value={album}
                        onChangeText={setAlbum}
                    />
                    {album ? (
                        <TouchableOpacity onPress={() => setAlbum('')} style={styles.clearButton}>
                            <Icon name="x" size={24} color="white" />
                        </TouchableOpacity>
                    ) : null}
                </View>
                <View style={styles.inputContainer}>
                    <TextInput
                        placeholder="Year"
                        placeholderTextColor='grey'
                        style={styles.input}
                        value={year}
                        onChangeText={setYear}
                    />
                    {year ? (
                        <TouchableOpacity onPress={() => setYear('')} style={styles.clearButton}>
                            <Icon name="x" size={24} color="white" />
                        </TouchableOpacity>
                    ) : null}
                </View>
                <View style={styles.buttonContainer}>
                    <TouchableOpacity onPress={handleSearch} style={styles.searchButton}>
                        <Text style={styles.buttonText}>Search <Icon name="search" size={20} color="white" /></Text>
                    </TouchableOpacity>
                </View>
            </View>
            {loading ? (
                <Text style={styles.loadingText}>Loading...</Text>
            ) : searchResults.length === 0 ? (
                <Text style={styles.noResultsText}>No results found for this search.</Text>
            ) : (
                <FlatList
                    data={searchResults}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContainer}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: globalStyles.defaultBackgroundColor,
    },
    searchBarContainer: {
        marginVertical: 10,
        backgroundColor: globalStyles.gray1,
        borderRadius: 8,
        padding: 5,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 3,
    },
    input: {
        color: 'white',
        fontSize: 18,
        height: 40,
        flex: 1,
        paddingHorizontal: 10,
        backgroundColor: globalStyles.gray2,
        borderRadius: 8,
        paddingRight: 40,
    },
    clearButton: {
        position: 'absolute',
        right: 10,
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 5,
    },
    searchButton: {
        padding: 10,
        backgroundColor: globalStyles.blue2,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },

    listContainer: {
        paddingBottom: 10,
    },
    songItem: {
        flexDirection: 'row',
        backgroundColor: globalStyles.defaultBackgroundColor,
        borderRadius: 8,
        padding: 4,
        marginBottom: 6,
        alignItems: 'center',
    },
    coverImage: {
        width: 60,
        height: 60,
        borderRadius: 5,
        marginRight: 10,
    },
    coverPlaceholder: {
        width: 60,
        height: 60,
        borderRadius: 5,
        marginRight: 10,
        backgroundColor: globalStyles.gray2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    noCoverPlaceholder: {
        backgroundColor: globalStyles.red2,
    },
    noCoverText: {
        color: 'white',
        fontSize: 12,
        textAlign: 'center',
    },
    songInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    songTitle: {
        color: 'white',
        fontSize: 14,
        fontWeight: 'bold',
    },
    songArtist: {
        color: 'lightgrey',
        fontSize: 12,
        fontWeight: 'bold',
    },
    songAlbum: {
        color: 'lightgrey',
        fontSize: 10,
    },
    songTrackNumber: {
        color: 'grey',
        fontSize: 9,
    },
    songReleaseDate: {
        color: 'grey',
        fontSize: 10,
    },
    addButton: {
        backgroundColor: globalStyles.blue2,
        marginRight: 10,
        borderRadius: 8,
        padding: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    addButtonText: {
        color: 'white',
        fontSize: 14,
    },
    loadingText: {
        color: 'white',
        textAlign: 'center',
        marginTop: 20,
    },
    noResultsText: {
        color: 'white',
        textAlign: 'center',
        marginTop: 20,
    },
});

export default OnlineSearch;