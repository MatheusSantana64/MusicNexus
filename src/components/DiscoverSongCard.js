import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, Alert } from 'react-native';
import { globalStyles } from '../styles/global';
import { discoverSongCardStyles as styles } from '../styles/componentsStyles';
import SongFormModal from './SongFormModal';
import { songExistsInDatabase } from '../database/databaseOperations';

const DiscoverSongCard = ({ item }) => {
    const [isFormModalVisible, setFormModalVisible] = useState(false);
    const [selectedSong, setSelectedSong] = useState(null);
    const [isSongInLibrary, setIsSongInLibrary] = useState(false);

    const artistName = item['artist-credit']?.[0]?.name || 'Unknown Artist';
    const albumTitle = item.releases?.[0]?.title || 'Unknown Album';
    const trackNumber = item.releases?.[0]?.media?.[0]?.track?.[0]?.number || 'N/A';
    const releaseDate = item.releases?.[0]?.date || 'Unknown Release Date';

    const checkIfSongExists = async () => {
        const exists = await songExistsInDatabase(item.title, artistName, albumTitle);
        setIsSongInLibrary(exists);
    };

    useEffect(() => {
        checkIfSongExists();
    }, [item.title, artistName, albumTitle]);

    const handleSongAdded = () => {
        checkIfSongExists();
    };

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
                    { backgroundColor: isSongInLibrary ? globalStyles.green2 : globalStyles.blue2 }
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
                    onSongAdded={handleSongAdded}
                />
            )}
        </View>
    );
};

export default DiscoverSongCard;