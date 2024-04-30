// This file contains the Card component which is used to display a song's information in a card format.
// It includes the song's title, artist, album, release date, rating, and an edit button that allows users to edit the song's information or delete.

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import Icon from 'react-native-vector-icons/Feather';
import { addToQueue } from '../api/MusicBrainzAPI';
import { updateSongCoverPath, updateSongRating } from '../database/databaseOperations';

import RatingModal from './RatingModal';
import SongOptionsModal from './SongOptionsModal';

const Card = ({ cardSong, songs, setSongs, refreshSongsList }) => {
    const [coverImage, setCoverImage] = useState(cardSong.cover_path);

    // Fetch cover image from MusicBrainz API
    const fetchCoverFromMusicBrainz = async () => {
        const coverPath = await addToQueue(cardSong.artist, cardSong.album);
        if (coverPath) {
            console.log(`(fetchCoverFromMusicBrainz) Cover image URL from internet for song: ${cardSong.title} by ${cardSong.artist} from ${cardSong.album}.\ncoverPath: ${coverPath}.`);
            setCoverImage(coverPath);
            return coverPath;
        }
        return null;
    };

    // Update database with new cover path
    const updateDatabaseWithCoverPath = async (coverPath) => {
        try {
            await updateSongCoverPath(cardSong.id, coverPath);
            console.log(`(updateDatabaseWithCoverPath) Cover path updated in the database for song: ${cardSong.title}.\ncardSong.cover_path: ${cardSong.cover_path}`);
        } catch (error) {
            console.log('Error updating cover path:', error);
        }
    };

    // Main function to fetch cover image (First locally then from internet)
    const fetchCover = async () => {
        // Check for cover online
        coverPath = await fetchCoverFromMusicBrainz();
        // If found online, update database
        if (coverPath) {
            updateDatabaseWithCoverPath(coverPath);
            cardSong.cover_path = coverPath;
        }
    };

    useEffect(() => {
        // If cardSong.cover_path is not set, check for cover
        console.log(`(useEffect) Checking for cover for song: ${cardSong.title} by ${cardSong.artist} from ${cardSong.album}.\ncardSong.cover_path: ${cardSong.cover_path}.`);
        if (!coverImage) fetchCover();
    }, [cardSong.artist, cardSong.album, cardSong.cover_path]);

    // Rating Modal
        const [isRatingModalVisible, setRatingModalVisible] = useState(false);

        // Handle Card Press (Show Rating Modal)
        const openRatingModal = () => {
            console.log(`Song selected for rating: ${cardSong.title} by ${cardSong.artist}`);
            setRatingModalVisible(true);
        };
        
        // Handle Rating Select (Update Song Rating)
        const handleRatingSelect = async (rating) => {
            try {
                await updateSongRating(cardSong.id, rating);
                console.log(`Song rating updated successfully for song: ${cardSong.title} by ${cardSong.artist}, New Rating: ${rating}`);
                setRatingModalVisible(false);
            } catch (error) {
                console.log('Error updating song rating:', error);
            }
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
                delayLongPress={200}
                style={styles.cardContainer}
            >
                <Image
                    placeholder={require('../../assets/placeholder60.png')}
                    placeholderContentFit={'cover'}
                    cachePolicy={'disk'}
                    contentFit={'cover'}
                    style={styles.image}
                    source={{ uri: coverImage }}
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