import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { globalStyles } from '../styles/global';
import Icon from 'react-native-vector-icons/Feather';
import { addToQueue } from '../api/MusicBrainzAPI';
import { getImageFromCache, downloadImage, generateCacheKey } from '../utils/cacheManager';
import { updateSongCoverPath, updateSongRating, getTagsForSong } from '../database/databaseOperations';

import RatingModal from './RatingModal';
import SongOptionsModal from './SongOptionsModal';

const coverRequestCache = {};

const Card = ({ cardSong, songs, setSongs, refreshSongsList }) => {
    const [coverImage, setCoverImage] = useState(cardSong.cover_path);
    const [associatedTags, setAssociatedTags] = useState([]);
    const [isRatingModalVisible, setRatingModalVisible] = useState(false);
    const [isSongOptionsVisible, setSongOptionsVisible] = useState(false);

    const fetchCoverFromCache = useCallback(async () => {
        const cacheKey = generateCacheKey(cardSong.artist, cardSong.album);
        const coverPath = await getImageFromCache(cacheKey);
        if (coverPath) {
            setCoverImage(coverPath);
        }
        return coverPath;
    }, [cardSong]);

    const fetchCoverFromMusicBrainz = useCallback(async () => {
        const coverPath = await addToQueue(cardSong.artist, cardSong.album);
        if (coverPath) {
            setCoverImage(coverPath);
        }
        return coverPath;
    }, [cardSong]);

    const downloadCoverImage = useCallback(async (coverPath) => {
        if (global.downloadCovers) {
            const downloadedPath = await downloadImage(coverPath, generateCacheKey(cardSong.artist, cardSong.album));
            if (downloadedPath) {
                setCoverImage(downloadedPath);
                await updateDatabaseWithCoverPath(downloadedPath);
                cardSong.cover_path = downloadedPath;
                return downloadedPath;
            }
            return null;
        }
        return coverPath;
    }, [cardSong]);

    const updateDatabaseWithCoverPath = useCallback(async (coverPath) => {
        try {
            await updateSongCoverPath(cardSong.id, coverPath);
        } catch (error) {
            console.error('Error updating cover path:', error);
        }
    }, [cardSong]);

    const fetchCover = useCallback(async () => {
        const cacheKey = generateCacheKey(cardSong.artist, cardSong.album);

        if (coverRequestCache[cacheKey]) {
            // Wait for the ongoing request to complete
            await coverRequestCache[cacheKey];
            setCoverImage(cardSong.cover_path);
            return;
        }

        let coverPath = await fetchCoverFromCache();
        if (!coverPath) {
            const fetchPromise = fetchCoverFromMusicBrainz();
            coverRequestCache[cacheKey] = fetchPromise;
            coverPath = await fetchPromise;
            delete coverRequestCache[cacheKey];
        }
        if (coverPath && global.downloadCovers !== 'false' && coverPath.startsWith('http')) {
            coverPath = await downloadCoverImage(coverPath);
        }
        if (coverPath) {
            await updateDatabaseWithCoverPath(coverPath);
            cardSong.cover_path = coverPath;
        }
    }, [cardSong, fetchCoverFromCache, fetchCoverFromMusicBrainz, downloadCoverImage, updateDatabaseWithCoverPath]);

    useEffect(() => {
        if (!coverImage && global.showCovers !== 'false') {
            fetchCover();
        } else if (coverImage && !coverImage.startsWith('file://') && global.downloadCovers !== 'false') {
            downloadCoverImage(coverImage);
        }
    }, [cardSong, coverImage, fetchCover, downloadCoverImage]);

    const fetchAssociatedTags = useCallback(async () => {
        if (cardSong.id) {
            const tags = await getTagsForSong(cardSong.id);
            setAssociatedTags(tags);
        }
    }, [cardSong.id]);

    useEffect(() => {
        fetchAssociatedTags();
    }, [fetchAssociatedTags]);

    useEffect(() => {
        if (cardSong.id) {
            getTagsForSong(cardSong.id).then(setAssociatedTags);
        }
    }, [cardSong.id]);

    const openRatingModal = () => setRatingModalVisible(true);

    const handleRatingSelect = async (rating) => {
        try {
            await updateSongRating(cardSong.id, rating, cardSong.rating);
            setRatingModalVisible(false);
        } catch (error) {
            console.error('Error updating song rating:', error);
        }
    };

    const openOptionsModal = () => setSongOptionsVisible(true);

    const renderRatingColor = () => {
        if (cardSong.rating === 0) return 'grey';
        if (cardSong.rating <= 2.5) return 'red';
        if (cardSong.rating > 2.5 && cardSong.rating <= 5) return 'orange';
        if (cardSong.rating > 5 && cardSong.rating <= 7.5) return 'yellow';
        if (cardSong.rating > 7.5 && cardSong.rating < 10) return 'lime';
        return 'turquoise';
    };

    const renderTags = () => (
        <View style={styles.tagsContainer}>
            {associatedTags.map((tag, index) => (
                <View key={index} style={[styles.tagItem, { backgroundColor: tag.color }]}>
                    <Text style={styles.tagText}>{tag.name}</Text>
                </View>
            ))}
        </View>
    );

    return (
        <View>
            <Pressable 
                onPress={openRatingModal}
                onLongPress={openOptionsModal} 
                delayLongPress={200}
                style={({ pressed }) => [
                    { backgroundColor: pressed ? globalStyles.black1 : globalStyles.black1 },
                    styles.cardContainer
                ]}
            >
                {global.showCovers !== 'false' && (
                    <Image
                        source={{ uri: coverImage }}
                        placeholder={require('../../assets/albumPlaceholder60.jpg')}
                        style={styles.image}
                        placeholderContentFit={'cover'}
                        cachePolicy={'none'}
                        contentFit={'cover'}
                    />
                )}
                <View style={styles.songInfoContainer}>
                    <View style={styles.songInfoTextContainer}>
                        <Text numberOfLines={1} ellipsizeMode='tail' style={styles.songTitle}>{cardSong.title || 'Unknown Title'}</Text>
                        <Text numberOfLines={1} ellipsizeMode='tail' style={styles.songInfoText}>{cardSong.artist || 'Unknown Artist'}<Text style={{ color: 'lightgrey' }}> - {cardSong.album || 'Unknown Album'}</Text></Text>
                        <Text style={styles.songInfoText}>{cardSong.release || 'Unknown Release Date'}</Text>
                        {renderTags()}
                    </View>
                </View>
                <View style={styles.ratingAndEditContainer}>
                    <View style={styles.ratingContainer}>
                        <Icon name="star" size={20} color={renderRatingColor()} />
                        <Text style={[styles.ratingText, { color: cardSong.rating === 0 ? 'lightgrey' : 'white' }]}>
                            {cardSong.rating ? cardSong.rating.toFixed(1) : 'N/A'}
                        </Text>
                    </View>
                    <View style={{ position: 'absolute', right: 0 }}>
                        <Pressable onPress={openOptionsModal} hitSlop={10}>
                            <Icon name="more-vertical" size={22} color="white" />
                        </Pressable>
                    </View>
                </View>
            </Pressable>
            <RatingModal
                isRatingModalVisible={isRatingModalVisible}
                closeModal={() => setRatingModalVisible(false)}
                handleRatingSelect={handleRatingSelect}
                selectedSong={cardSong}
                songs={songs}
                setSongs={setSongs}
                onTagsChange={fetchAssociatedTags}
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
        borderRadius: 8,
        paddingRight: 5,
        marginBottom: 5,
        width: '100%',
        height: 'auto',
    },
    image: {
        width: globalStyles.coverSize,
        height: globalStyles.coverSize,
        borderRadius: 5,
        marginRight: 10,
        marginLeft: 10,
        marginVertical: 5,
        alignSelf: 'center',
    },
    songInfoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        maxWidth: '58%',
    },
    songInfoTextContainer: {
        flex: 1,
        marginRight: 10,
    },
    songInfoText: {
        color: 'white',
        fontSize: 10,
        flexWrap: 'wrap',
        width: '100%',
        fontFamily: globalStyles.defaultFont,
    },
    songTitle: {
        color: 'white',
        fontSize: 13,
        flexWrap: 'wrap',
        fontWeight: 'bold',
        fontFamily: globalStyles.defaultFont,
    },
    ratingAndEditContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    ratingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'start',
    },
    ratingText: {
        color: 'white',
        fontSize: 14,
        fontWeight: 'bold',
        flexWrap: 'wrap',
        width: '60%',
        textAlign: 'center',
        fontFamily: globalStyles.defaultFont,
    },
    tagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 2,
        marginBottom: 2,
    },
    tagItem: {
        borderRadius: 20,
        paddingHorizontal: 5,
        paddingVertical: 1,
        marginRight: 3,
        marginBottom: 3,
    },
    tagText: {
        color: 'white',
        textAlign: 'center',
        fontSize: 10,
        fontFamily: globalStyles.defaultFont,
    },
});

export default React.memo(Card);