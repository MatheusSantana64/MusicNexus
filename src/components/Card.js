// This file contains the Card component which is used to display a song's information in a card format.
// It includes the song's title, artist, album, release date, rating, and an edit button that allows users to edit the song's information or delete.

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { fetchAlbumCover } from '../api/MusicBrainzAPI';
import { getImageFromCache, downloadImage, generateCacheKey } from '../utils/cacheManager';
import { db } from '../database/databaseSetup';

import RatingModal from './RatingModal';
import SongOptionsModal from './SongOptionsModal';

const Card = ({ cardSong, songs, setSongs, refreshSongsList }) => {

    const [coverImg, setCoverImg] = useState(cardSong.cover_path);

    // Define checkForLocalCover outside of useEffect
    const checkForLocalCover = async () => {
        if(!cardSong.cover_path) {
            const cacheKey = generateCacheKey(cardSong.artist, cardSong.album);
            cardSong.cover_path = await getImageFromCache(cacheKey);
            setCoverImg(cardSong.cover_path);
            if (!cardSong.cover_path) {
                cardSong.cover_path = await fetchAlbumCover(cardSong.artist, cardSong.album, cacheKey);
                setCoverImg(cardSong.cover_path);
                console.log(`Cover image URL fetched for song: ${cardSong.title} by ${cardSong.artist} from ${cardSong.album}.\ncardSong.cover_path: ${cardSong.cover_path}`);
                if (cardSong.cover_path) {
                    // Download the cover image
                    console.log(`Downloading cover image for song: ${cardSong.title} by ${cardSong.artist} from ${cardSong.album}.\ncardSong.cover_path: ${cardSong.cover_path}`);
                    cardSong.cover_path = await downloadImage(cardSong.cover_path, cacheKey);
                    setCoverImg(cardSong.cover_path);
                    console.log(`Cover image downloaded successfully for song: ${cardSong.title} by ${cardSong.artist} from ${cardSong.album}.\ncardSong.cover_path: ${cardSong.cover_path}`);
                }
            }
            db.transaction(tx => {
                //console.log(`Updating cover path in the database for song: ${cardSong.title} by ${cardSong.artist} from ${cardSong.album}.\ncardSong.cover_path: ${cardSong.cover_path}`);
                tx.executeSql(
                    'UPDATE songs SET cover_path = ? WHERE id = ?',
                    [cardSong.cover_path, cardSong.id],
                    () => console.log('Cover path updated in the database. For song: ', cardSong.title, '. cardSong.cover_path: ', cardSong.cover_path),
                    (_, error) => console.log('Error updating cover path:', error)
                );
            });
        }
        else {
            //console.log(`Cover image already exists for song: ${cardSong.title} by ${cardSong.artist} from ${cardSong.album}.\ncardSong.cover_path: ${cardSong.cover_path}`);
        }
    };

    useEffect(() => {
        //console.log(`Entered useEffect of Card.js for: ${cardSong.title} by ${cardSong.artist} from ${cardSong.album}.\nCover Path: ${cardSong.cover_path}`);
        checkForLocalCover();
    }, [cardSong.artist, cardSong.album, cardSong.cover_path]);

    // Rating Modal
        const [isRatingModalVisible, setRatingModalVisible] = useState(false);

        // Handle Card Press (Show Rating Modal)
        const openRatingModal = () => {
            console.log(`Song selected for rating: ${cardSong.title} by ${cardSong.artist}`);
            setRatingModalVisible(true);
        };
        
        // Handle Rating Select (Update Song Rating)
        const handleRatingSelect = (rating) => {
            db.transaction(tx => {
                tx.executeSql(
                    'UPDATE songs SET rating = ? WHERE id = ?',
                    [rating, cardSong.id],
                    () => {
                        console.log(`Song rating updated successfully for song: ${cardSong.title} by ${cardSong.artist}, New Rating: ${rating}`);
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
        if (cardSong.rating === 0) return 'grey';
        if (cardSong.rating <= 2.5) return 'red';
        if (cardSong.rating > 2.5 && cardSong.rating <= 5) return 'orange';
        if (cardSong.rating > 5 && cardSong.rating <= 7.5) return 'yellow';
        if (cardSong.rating > 7.5 && cardSong.rating < 10) return 'lime';
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
                <Image
                    resizeMode="cover"
                    resizeMethod="scale"
                    style={styles.image}
                    source={ coverImg ? { uri: coverImg } : require('../../assets/placeholder60.png') }
                />
                <View style={styles.songInfoContainer}>
                    <View style={styles.songInfoTextContainer}>
                        <Text style={styles.songTitle}>{cardSong.title || 'Unknown Title'}</Text>
                        <Text style={styles.songInfo}>{cardSong.artist || 'Unknown Artist'}</Text>
                        <Text style={styles.songInfo}>{cardSong.album || 'Unknown Album'}</Text>
                        <Text style={styles.songInfo}>{cardSong.release || 'Unknown Release Date'}</Text>
                    </View>
                </View>
                
                <View style={styles.ratingAndEditContainer}>
                    <View style={styles.ratingContainer}>
                        <Icon name="star" size={24} color={renderRatingColor()} />
                        <Text style={styles.ratingText}>{cardSong.rating ? (cardSong.rating.toFixed(1)) : 'N/A'}</Text>
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
                selectedSong={cardSong}
                songs={songs}
                setSongs={setSongs}
            />

            <SongOptionsModal
                isSongOptionsVisible={isSongOptionsVisible}
                closeModal={() => setSongOptionsVisible(false)}
                selectedSong={cardSong}
                songs={songs}
                setSongs={setSongs}
                refreshSongsList={refreshSongsList}
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