// History.js
import React, { useState, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { fetchGlobalRatingHistory } from '../database/databaseOperations';
import { FlashList } from '@shopify/flash-list';

const OFFSET_SIZE = 50;

const History = () => {
    const [ratingHistory, setRatingHistory] = useState([]);
    const [offset, setOffset] = useState(0);
    const [hasMore, setHasMore] = useState(true);

    // Fetch songs from the SQLite database with dynamic query and pagination
    const fetchHistory = async (offset = 0) => {
        // Fetch songs from the SQLite database
        const fetchedHistory = await fetchGlobalRatingHistory(offset);

        setRatingHistory(prevHistory => [...prevHistory, ...fetchedHistory]);
        
        setHasMore(fetchedHistory.length >= OFFSET_SIZE);
    };

    // Fetch more songs when the user scrolls down the list
    const fetchMore = () => {
        const newOffset = offset + OFFSET_SIZE;
        fetchHistory(newOffset);
        setOffset(newOffset);
    };

    // Fetch songs when the screen is focused
    useFocusEffect(
        React.useCallback(() => {
            fetchHistory(0);
            setRatingHistory([]);
            setOffset(0);
        }, [])
    );

    const handleScroll = (event) => {
        const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
        const isEndReached = layoutMeasurement.height + contentOffset.y >= contentSize.height - 1000;
        if (isEndReached && hasMore) {
            fetchMore();
        }
    };

    const formatDateTime = (datetimeString) => {
        const date = new Date(datetimeString);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are zero-based.
        const year = date.getFullYear();
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');

        return `${day}/${month}/${year}\n${hours}:${minutes}:${seconds}`;
    };

    const renderItem = ({ item }) => (
        <View style={styles.cardContainer}>
            {global.showCovers === 'true' && (
                <Image
                    source={{ uri: item.cover_path }}
                    placeholder={require('../../assets/albumPlaceholder60.jpg')}
                    style={{ width: 70, height: 70, margin: 5, marginRight: 0, borderRadius: 5 }}
                    placeholderContentFit={'cover'}
                    cachePolicy={'none'}
                    contentFit={'cover'}
                />
            )}
            <View style={styles.songInfoContainer}>
                <View style={{flexDirection: 'column'}}>
                    <Text style={{ ...styles.songInfo, fontSize: 14}}>{item.title}</Text>
                    <Text style={styles.songInfo}>{item.artist}</Text>
                    <Text style={styles.songInfo}>{item.album}</Text>
                </View>
            </View>
            
            <View style={styles.ratingAndEditContainer}>
                    <Text style={styles.ratingText}><Text style={{color: 'lightcoral'}}>{item.previous_rating ? (item.previous_rating.toFixed(1)) : 'N/A'}</Text>
                    {' → '}
                    <Text style={{color: 'lightgreen'}}>{(item.rating.toFixed(1))}</Text></Text>
                    <Text style={{ ...styles.songInfo, fontSize: 12}}>Updated:{'\n'}{formatDateTime(item.datetime)}</Text>
            </View>
        </View>
    );

    const extractKey = (item, index) => String(index);

    return (
        <View style={styles.container}>
            <Text style={styles.pageTitle}>Rating History</Text>
            <FlashList
                data={ratingHistory}
                keyExtractor={extractKey}
                estimatedItemSize={90}
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
        backgroundColor: '#1e272e',
        borderRadius: 8,
        paddingRight: 10,
        marginBottom: 10,
        width: '100%',
        height: 80,
    },
    songInfoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginLeft: 10,
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
});
/*
const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 20,
        paddingHorizontal: 20,
        backgroundColor: 'black',
    },
    historyItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: '#1e272e',
        padding: 5,
        borderRadius: 8,
        marginBottom: 10,
        width: '100%',
        height: 80,
    },
    pageTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
        color: 'white',
    },
    coverImage: {
        width: 70,
        height: 70,
        borderRadius: 5,
        marginRight: 10,
    },
    column: {
        flexGrow: 1, // Add this line
        flexDirection: 'column',
        justifyContent: 'center',
    },
    historyText: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'normal',
        flexWrap: 'wrap',
    },
});
*/
export default History;