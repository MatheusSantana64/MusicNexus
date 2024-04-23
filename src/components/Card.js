// This file contains the Card component which is used to display a song's information in a card format.
// It includes the song's title, artist, album, release date, rating, and an edit button that allows users to edit the song's information or delete.

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { fetchAlbumCover, generateCacheKey } from '../api/MusicBrainzAPI';
import { getImageFromCache, downloadImage } from '../utils/cacheManager';
import { db } from '../database/databaseSetup';

const Card = ({ song, onCardPress, onEditPress, onLongPress }) => {
    const [coverUrl, setCoverUrl] = useState(null);

    useEffect(() => {
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
        <TouchableOpacity 
            onPress={onCardPress}
            onLongPress={onLongPress} 
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
                <TouchableOpacity onPress={onEditPress} style={styles.editButton}>
                    <Icon name="more-vertical" size={24} color="white" />
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
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