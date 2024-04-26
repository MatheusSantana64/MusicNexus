// This file contains the Card component which is used to display a song's information in a card format.
// It includes the song's title, artist, album, release date, rating, and an edit button that allows users to edit the song's information or delete.

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { fetchAlbumCover, generateCacheKey } from '../api/MusicBrainzAPI';
import { getImageFromCache, downloadImage } from '../utils/cacheManager';
import { db } from '../database/databaseSetup';

import RatingModal from './RatingModal';
import SongOptionsModal from './SongOptionsModal';

const Card = ({ song, songs, setSongs }) => {
    const [coverUrl, setCoverUrl] = useState(null);

    useEffect(() => {
        // Check if the cover image is already in the cache
        const checkForLocalCover = async () => {
            const cacheKey = generateCacheKey(song.artist, song.album);
            const localCoverPath = await getImageFromCache(cacheKey);
            if (localCoverPath) {
                setCoverUrl(localCoverPath);
            } else {
                // If the cover is not in the cache, fetch it from the API
                const coverUrl = await fetchAlbumCover(song.artist, song.album);
                if (coverUrl) {
                    // Download the image and store its local path in the database
                    const localUri = await downloadImage(coverUrl, cacheKey);
                    setCoverUrl(localUri);
                    // Update the database with the local path of the cover image
                    db.transaction(tx => {
                        tx.executeSql(
                            'UPDATE songs SET cover_path = ? WHERE id = ?',
                            [localUri, song.id],
                            () => console.log('Cover path updated in the database'),
                            (_, error) => console.log('Error updating cover path:', error)
                        );
                    });
                }
            }
        };
        checkForLocalCover();
    }, [song.artist, song.album]);

    // Rating Modal
        const [isRatingModalVisible, setRatingModalVisible] = useState(false);

        // Handle Card Press (Show Rating Modal)
        const openRatingModal = () => {
            console.log(`Song selected for rating: ${song.title} by ${song.artist}`);
            setRatingModalVisible(true);
        };
        
        // Handle Rating Select (Update Song Rating)
        const handleRatingSelect = (rating) => {
            db.transaction(tx => {
                tx.executeSql(
                    'UPDATE songs SET rating = ? WHERE id = ?',
                    [rating, song.id],
                    () => {
                        console.log(`Song rating updated successfully for song: ${song.title} by ${song.artist}, New Rating: ${rating}`);
                        setRatingModalVisible(false);
                    },
                    (_, error) => console.log('Error updating song rating:', error)
                );
            });
        };

    // Song Options Modal
        const [isSongOptionsVisible, setSongOptionsVisible] = useState(false);

        // Handle Long Press (Show Edit/Delete Modal)
        const openOptionsModal = () => {
            setSongOptionsVisible(true);
        };

    // Function to render the color of the rating based on its value
    const renderRatingColor = () => {
        if (song.rating === 0) return 'grey';
        if (song.rating <= 2.5) return 'red';
        if (song.rating > 2.5 && song.rating <= 5) return 'orange';
        if (song.rating > 5 && song.rating <= 7.5) return 'yellow';
        if (song.rating > 7.5 && song.rating < 10) return 'lime';
        return 'turquoise';
    };

    return (
        <View>
            <TouchableOpacity 
                onPress={openRatingModal}
                onLongPress={openOptionsModal} 
                delayLongPress={100}
                style={styles.cardContainer}
            >
                {coverUrl ? (
                    <Image
                        source={{ uri: coverUrl }}
                        resizeMode="cover"
                        resizeMethod="scale"
                        style={styles.image}
                    />
                ) : (
                    <Image
                        source={require('../../assets/placeholder60.png')} // Fallback to placeholder image
                        resizeMode="cover"
                        resizeMethod="scale"
                        style={styles.image}
                    />
                )}
                <View style={styles.songInfoContainer}>
                    <View style={styles.songInfoTextContainer}>
                        <Text style={styles.songTitle}>{song.title || 'Unknown Title'}</Text>
                        <Text style={styles.songInfo}>{song.artist || 'Unknown Artist'}</Text>
                        <Text style={styles.songInfo}>{song.album || 'Unknown Album'}</Text>
                        <Text style={styles.songInfo}>{song.release || 'Unknown Release Date'}</Text>
                    </View>
                </View>
                
                <View style={styles.ratingAndEditContainer}>
                    <View style={styles.ratingContainer}>
                        <Icon name="star" size={24} color={renderRatingColor()} />
                        <Text style={styles.ratingText}>{song.rating ? (song.rating.toFixed(1)) : 'N/A'}</Text>
                    </View>
                    <TouchableOpacity onPress={openOptionsModal} style={styles.editButton}>
                        <Icon name="more-vertical" size={24} color="white" />
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>

            <RatingModal
                isRatingModalVisible={isRatingModalVisible}
                closeModal={() => setRatingModalVisible(false)}
                handleRatingSelect={handleRatingSelect}
                selectedSong={song}
                songs={songs}
                setSongs={setSongs}
            />

            <SongOptionsModal
                isSongOptionsVisible={isSongOptionsVisible}
                closeModal={() => setSongOptionsVisible(false)}
                selectedSong={song}
                songs={songs}
                setSongs={setSongs}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    cardContainer: {
        flexDirection: 'row',
        backgroundColor: '#1e272e',
        borderRadius: 8,
        padding: 10,
        marginBottom: 10,
        width: '100%',
        height: 80,
    },
    songInfoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    image: {
        width: 60,
        height: 60,
        marginRight: 10,
        borderRadius: 5,
    },
    songInfoTextContainer: {
        flex: 1,
    },
    songInfo: {
        color: 'white',
        fontSize: 10,
        flexWrap: 'wrap',
    },
    songTitle: {
        color: 'white',
        fontSize: 14,
        flexWrap: 'wrap',
    },
    ratingAndEditContainer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
    },
    ratingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    ratingText: {
        color: 'white',
        fontSize: 16,
        marginLeft: 5,
    },
    editButton: {
        marginLeft: 5,
    },
});

export default React.memo(Card);