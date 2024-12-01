import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Alert } from 'react-native';
import { globalStyles } from '../styles/global';
import SongFormModal from './SongFormModal';
import { songExistsInDatabase } from '../database/databaseOperations';

const DiscoverSongCard = ({ item, handleAddSong }) => {
    const [isFormModalVisible, setFormModalVisible] = useState(false);
    const [selectedSong, setSelectedSong] = useState(null);
    const [isSongInLibrary, setIsSongInLibrary] = useState(false);

    const artistName = item['artist-credit']?.[0]?.name || 'Unknown Artist';
    const albumTitle = item.releases?.[0]?.title || 'Unknown Album';
    const trackNumber = item.releases?.[0]?.media?.[0]?.track?.[0]?.number || 'N/A';
    const releaseDate = item.releases?.[0]?.date || 'Unknown Release Date';

    useEffect(() => {
        const checkIfSongExists = async () => {
            const exists = await songExistsInDatabase(item.title, artistName, albumTitle);
            console.log(`Checking if song exists: ${item.title} by ${artistName} from ${albumTitle} - ${exists}`);
            setIsSongInLibrary(exists);
        };

        checkIfSongExists();
    }, [item.title, artistName, albumTitle]);

    const openFormModal = (song) => {
        if (isSongInLibrary) {
            Alert.alert(
                'Check Library',
                'This song might already be in your library. Do you want to add it again?',
                [
                    {
                        text: 'Cancel',
                        style: 'cancel',
                    },
                    {
                        text: 'Add Song',
                        onPress: () => {
                            setSelectedSong(song);
                            setFormModalVisible(true);
                        },
                    },
                ],
                { cancelable: true }
            );
        } else {
            setSelectedSong(song);
            setFormModalVisible(true);
        }
    };

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
                    {item.title}
                </Text>
                <Text style={styles.songArtist}>{artistName}</Text>
                <Text style={styles.songAlbum}>{albumTitle}</Text>
                <Text style={styles.songReleaseDate}>{releaseDate}</Text>
            </View>
            <TouchableOpacity
                onPress={() => openFormModal(item)}
                style={[
                    styles.addButton,
                    { backgroundColor: isSongInLibrary ? globalStyles.green2 : globalStyles.blue2 } // Replace 'defaultColor' with your default button color
                ]}
            >
                <Text style={styles.addButtonText}>{isSongInLibrary ? 'Added' : 'Add'}</Text>
            </TouchableOpacity>
            {isFormModalVisible && (
                <SongFormModal
                    isFormModalVisible={isFormModalVisible}
                    closeModal={() => setFormModalVisible(false)}
                    selectedSong={{
                        title: item.title,
                        artist: artistName,
                        album: albumTitle,
                        release: releaseDate,
                    }}
                    songs={[]}
                    setSongs={() => {}}
                    refreshSongsList={() => {}}
                    fromDiscover={true}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
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
});

export default DiscoverSongCard;