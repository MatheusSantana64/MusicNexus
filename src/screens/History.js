import React, { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { fetchGlobalRatingHistory } from '../database/databaseOperations';
import { FlatList } from 'react-native';
import { globalStyles } from '../styles/global';

const OFFSET_SIZE = 50;

const History = () => {
    const [ratingHistory, setRatingHistory] = useState([]);
    const [offset, setOffset] = useState(0);
    const [hasMore, setHasMore] = useState(true);

    const fetchHistory = useCallback(async (offset = 0) => {
        const fetchedHistory = await fetchGlobalRatingHistory(offset);
        setRatingHistory(prevHistory => [...prevHistory, ...fetchedHistory]);
        setHasMore(fetchedHistory.length >= OFFSET_SIZE);
    }, []);

    const fetchMore = useCallback(() => {
        const newOffset = offset + OFFSET_SIZE;
        fetchHistory(newOffset);
        setOffset(newOffset);
    }, [offset, fetchHistory]);

    useFocusEffect(
        useCallback(() => {
            fetchHistory(0);
            setRatingHistory([]);
            setOffset(0);
        }, [fetchHistory])
    );

    const handleScroll = useCallback((event) => {
        const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
        const isEndReached = layoutMeasurement.height + contentOffset.y >= contentSize.height - 1000;
        if (isEndReached && hasMore) {
            fetchMore();
        }
    }, [hasMore, fetchMore]);

    const formatDateTime = (datetimeString) => {
        const date = new Date(datetimeString);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');

        return `${day}/${month}/${year}\n${hours}:${minutes}:${seconds}`;
    };

    const renderItem = ({ item }) => (
        <View style={styles.cardContainer}>
            {global.showCovers !== 'false' && (
                <Image
                    source={{ uri: item.cover_path }}
                    placeholder={require('../../assets/albumPlaceholder60.jpg')}
                    style={styles.coverImage}
                    placeholderContentFit={'cover'}
                    cachePolicy={'none'}
                    contentFit={'cover'}
                />
            )}
            <View style={styles.songInfoContainer}>
                <View style={styles.songInfoColumn}>
                    <Text style={styles.songTitle}>{item.title}</Text>
                    <Text style={styles.songInfo}>{item.artist}</Text>
                    <Text style={styles.songInfo}>{item.album}</Text>
                </View>
            </View>
            <View style={styles.ratingAndEditContainer}>
                <Text style={styles.ratingText}>
                    <Text style={styles.previousRating}>{item.previous_rating ? item.previous_rating.toFixed(1) : 'N/A'}</Text>
                    {' → '}
                    <Text style={styles.currentRating}>{item.rating.toFixed(1)}</Text>
                </Text>
                <Text style={styles.updateTime}>Updated:{'\n'}{formatDateTime(item.datetime)}</Text>
            </View>
        </View>
    );

    const extractKey = (item, index) => String(index);

    return (
        <View style={styles.container}>
            <Text style={styles.pageTitle}>Rating History</Text>
            <FlatList
                data={ratingHistory}
                keyExtractor={extractKey}
                renderItem={renderItem}
                onScroll={handleScroll}
                removeClippedSubviews={false}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingTop: 20,
        paddingHorizontal: 20,
        backgroundColor: 'black',
        height: '100%',
    },
    pageTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
        color: 'white',
        textAlign: 'center',
    },
    cardContainer: {
        flexDirection: 'row',
        backgroundColor: globalStyles.defaultBackgroundColor,
        borderRadius: 8,
        paddingRight: 10,
        marginBottom: 5,
        width: '100%',
        height: 'auto',
    },
    coverImage: {
        width: globalStyles.coverSize,
        height: globalStyles.coverSize,
        alignSelf: 'center',
        marginRight: 0,
        borderRadius: 5,
    },
    songInfoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginLeft: 10,
    },
    songInfoColumn: {
        flexDirection: 'column',
    },
    songTitle: {
        fontSize: 14,
        color: 'white',
    },
    songInfo: {
        color: 'white',
        fontSize: 10,
        flexWrap: 'wrap',
    },
    ratingAndEditContainer: {
        flexDirection: 'column',
        justifyContent: 'flex-end',
        alignItems: 'center',
        marginHorizontal: 5,
        marginBottom: 5,
    },
    ratingText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    previousRating: {
        color: 'lightcoral',
    },
    currentRating: {
        color: 'lightgreen',
    },
    updateTime: {
        fontSize: 12,
        color: 'white',
    },
});

export default History;