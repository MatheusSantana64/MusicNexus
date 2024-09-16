// This file contains the Card component which is used to display a song's information in a card format.
// It includes the song's title, artist, album, release date, rating, and an edit button that allows users to edit the song's information or delete.

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import Icon from 'react-native-vector-icons/Feather';
import { addToQueue } from '../api/MusicBrainzAPI';
import { getImageFromCache, downloadImage, generateCacheKey } from '../utils/cacheManager';
import { updateSongCoverPath, updateSongRating, getTagsForSong } from '../database/databaseOperations';

import RatingModal from './RatingModal';
import SongOptionsModal from './SongOptionsModal';

const Card = ({ cardSong, songs, setSongs, refreshSongsList }) => {
    // Cover Image
        const [coverImage, setCoverImage] = useState(cardSong.cover_path);

        // 1. Fetch cover image from cache
        useEffect(() => {
            // If cardSong.cover_path is not set, check for cover
            if (!coverImage && global.showCovers != 'false') fetchCover();
            else {
                // Check if coverImage is a URL, not a file, then download cover
                if (coverImage && !coverImage.startsWith('file://') && global.downloadCovers !== 'false') downloadCoverImage(coverImage);
            }
        }, [cardSong.artist, cardSong.album, cardSong.cover_path]);

        // 2. Fetch cover image locally. If not found, fetch on internet
        const fetchCover = async () => {
            // Check for cover in cache
            console.log(`Checking for local cover for song: ${cardSong.title} by ${cardSong.artist} from ${cardSong.album}.\ncardSong.cover_path: ${cardSong.cover_path}.`);
            let coverPath = await fetchCoverFromCache();
            // If not found in cache, fetch cover from internet
            if (!coverPath) {
                coverPath = await fetchCoverFromMusicBrainz();
                // If found on internet, download cover
                if (coverPath && global.downloadCovers !== 'false') {
                    coverPath = await downloadCoverImage(coverPath);
                }
            }
            // If found, update database
            if (coverPath) {
                updateDatabaseWithCoverPath(coverPath);
                cardSong.cover_path = coverPath;
            }
        };

        // 3. Fetch cover image from cache
        const fetchCoverFromCache = async () => {
            console.log(`(fetchCoverFromCache) Checking for local cover for song: ${cardSong.title} by ${cardSong.artist} from ${cardSong.album}.\ncardSong.cover_path: ${cardSong.cover_path}.`);
            const cacheKey = generateCacheKey(cardSong.artist, cardSong.album);
            const coverPath = await getImageFromCache(cacheKey);
            if (coverPath) {
                console.log(`(fetchCoverFromCache) Cover image URL fetched from cache for song: ${cardSong.title} by ${cardSong.artist} from ${cardSong.album}.\ncardSong.cover_path: ${cardSong.cover_path}. coverPath: ${coverPath}.`);
                setCoverImage(coverPath);
                return coverPath;
            }
            return null;
        };

        // 4. Fetch cover image from MusicBrainz API
        const fetchCoverFromMusicBrainz = async () => {
            const coverPath = await addToQueue(cardSong.artist, cardSong.album);
            if (coverPath) {
                console.log(`(fetchCoverFromMusicBrainz) Cover image URL from internet for song: ${cardSong.title} by ${cardSong.artist} from ${cardSong.album}.\ncoverPath: ${coverPath}.`);
                setCoverImage(coverPath);
                return coverPath;
            }
            return null;
        };

        // 5. Download cover image
        const downloadCoverImage = async (coverPath) => {
            console.log(`(downloadCoverImage) Checking for internet cover for song: ${cardSong.title} by ${cardSong.artist} from ${cardSong.album}.\ncardSong.cover_path: ${cardSong.cover_path}. coverPath: ${coverPath}.`);
            if(global.downloadCovers){
                const downloadedPath = await downloadImage(coverPath, generateCacheKey(cardSong.artist, cardSong.album));
                if (downloadedPath) {
                    console.log(`(downloadCoverImage) Cover image URL downloaded for song: ${cardSong.title} by ${cardSong.artist} from ${cardSong.album}.\ndownloadedPath: ${downloadedPath}.`);
                    setCoverImage(downloadedPath);
                    updateDatabaseWithCoverPath(downloadedPath);
                    cardSong.cover_path = downloadedPath;
                    return downloadedPath;
                }
                return null;
            }
            else return coverPath;
        };

        // 6. Update database with new cover path
        const updateDatabaseWithCoverPath = async (coverPath) => {
            try {
                await updateSongCoverPath(cardSong.id, coverPath);
                console.log(`(updateDatabaseWithCoverPath) Cover path updated in the database for song: ${cardSong.title}.\ncardSong.cover_path: ${cardSong.cover_path}`);
            } catch (error) {
                console.log('Error updating cover path:', error);
            }
        };

    // Tags
        const [associatedTags, setAssociatedTags] = useState([]);

        useEffect(() => {
            if (cardSong.id) {
                getTagsForSong(cardSong.id).then(associatedTags => setAssociatedTags(associatedTags));
            }
        }, [cardSong.id]);
    
        // useEffect to check the associated tags through a console log
        useEffect(() => {
            console.log('Associated tags:', associatedTags);
        }, [associatedTags]);

        const renderTags = () => {
            return (
                <View style={styles.tagsContainer}>
                    {associatedTags.map((tag, index) => (
                        <View key={index} style={{ ...styles.tagItem, backgroundColor: tag.color }}>
                            <Text style={styles.tagText}>{tag.name}</Text>
                        </View>
                    ))}
                </View>
            );
        };

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
                await updateSongRating(cardSong.id, rating, cardSong.rating);
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
                {global.showCovers !== 'false' && (
                    <Image
                        source={{ uri: coverImage }}
                        placeholder={require('../../assets/albumPlaceholder60.jpg')}
                        style={styles.image}
                        placeholderContentFit={'cover'}
                        cachePolicy={'none'} // Disable expo-image cache (Cache is done manually)
                        contentFit={'cover'}
                    />
                )}
                <View style={styles.songInfoContainer}>
                    <View style={styles.songInfoTextContainer}>
                        <Text style={styles.songTitle}>{cardSong.title || 'Unknown Title'}</Text>
                        <Text style={styles.songInfo}>{cardSong.artist || 'Unknown Artist'}</Text>
                        <Text style={styles.songInfo}>{cardSong.album || 'Unknown Album'}</Text>
                        <Text style={styles.songInfo}>{cardSong.release || 'Unknown Release Date'}</Text>
                        {renderTags()}
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
        paddingRight: 10,
        marginBottom: 10,
        width: '100%',
        height: 'auto',
    },
    songInfoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    image: {
        width: 70,
        height: 70,
        borderRadius: 5,
        marginRight: 0,
        marginLeft: 5,
        marginVertical: 5,
        alignSelf: 'center',
    },
    songInfoTextContainer: {
        flex: 1,
        marginLeft: 10,
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

    tagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 5,
        marginBottom: 2,
    },
    tagItem: {
        borderRadius: 20,
        paddingHorizontal: 5,
        paddingVertical: 2,
        marginRight: 3,
        marginBottom: 3,
    },
    tagText: {
        color: 'white',
        textAlign: 'center',
        fontSize: 10,
    },
});

export default React.memo(Card);