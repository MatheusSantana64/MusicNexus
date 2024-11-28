import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { initDatabase } from '../database/databaseSetup';
import { fetchSongs } from '../database/databaseOperations';
import SongList from '../components/SongList';
import OrderButtons from '../components/OrderButtons';
import AsyncStorage from '@react-native-async-storage/async-storage';

export function Home() {
    const [state, setState] = useState({
        favoriteSongs: [],
        orderFav: 'rating',
        orderDirectionFav: 'desc',
        notRatedSongs: [],
        orderNotRated: 'release',
        orderDirectionNotRated: 'asc',
    });

    const { favoriteSongs, orderFav, orderDirectionFav, notRatedSongs, orderNotRated, orderDirectionNotRated } = state;

    useEffect(() => {
        initDatabase();
    }, []);

    useFocusEffect(
        useCallback(() => {
            const loadSettings = async () => {
                const [showCovers, downloadCovers] = await Promise.all([
                    AsyncStorage.getItem('@music_nexus_show_covers'),
                    AsyncStorage.getItem('@music_nexus_download_covers'),
                ]);
                global.showCovers = showCovers;
                global.downloadCovers = downloadCovers;
                console.log('global.showCovers:', global.showCovers);
                console.log('global.downloadCovers:', global.downloadCovers);
            };

            const fetchSongsWrapper = async () => {
                const [songsFav, songsNotRated] = await Promise.all([
                    fetchSongs('', orderFav, orderDirectionFav, 0, false, { min: 5, max: 10 }),
                    fetchSongs('', orderNotRated, orderDirectionNotRated, 0, false, { min: 0, max: 0 }),
                ]);
                setState(prevState => ({
                    ...prevState,
                    favoriteSongs: songsFav,
                    notRatedSongs: songsNotRated,
                }));
            };

            loadSettings();
            fetchSongsWrapper();
        }, [orderFav, orderDirectionFav, orderNotRated, orderDirectionNotRated])
    );

    const handleOrderChange = useCallback((orderKey, orderValue, directionKey, directionValue) => {
        setState(prevState => ({
            ...prevState,
            [orderKey]: orderValue,
            [directionKey]: directionValue,
        }));
    }, []);

    return (
        <View style={styles.screen}>
            <Section
                title="Favorite Songs"
                songs={favoriteSongs}
                setSongs={(newSongs) => setState(prevState => ({ ...prevState, favoriteSongs: newSongs }))}
                order={orderFav}
                orderKey="orderFav"
                orderDirection={orderDirectionFav}
                directionKey="orderDirectionFav"
                onOrderChange={handleOrderChange}
            />
            <Section
                title="Not Rated Songs"
                songs={notRatedSongs}
                setSongs={(newSongs) => setState(prevState => ({ ...prevState, notRatedSongs: newSongs }))}
                order={orderNotRated}
                orderKey="orderNotRated"
                orderDirection={orderDirectionNotRated}
                directionKey="orderDirectionNotRated"
                onOrderChange={handleOrderChange}
            />
        </View>
    );
}

const Section = ({ title, songs, setSongs, order, orderKey, orderDirection, directionKey, onOrderChange }) => (
    <View style={styles.sectionContainer}>
        <View style={styles.titleContainer}>
            <Text style={styles.title}>{title}</Text>
            <OrderButtons
                order={order}
                setOrder={(newOrder) => onOrderChange(orderKey, newOrder, directionKey, orderDirection)}
                orderDirection={orderDirection}
                setOrderDirection={(newDirection) => onOrderChange(orderKey, order, directionKey, newDirection)}
            />
        </View>
        <SongList songs={songs} setSongs={setSongs} />
    </View>
);

const styles = StyleSheet.create({
    title: {
        fontSize: 24,
        color: 'white',
    },
    titleContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginVertical: 12,
    },
    screen: {
        flex: 1,
        backgroundColor: '#090909',
        paddingTop: 4,
        paddingHorizontal: 5,
    },
    sectionContainer: {
        flex: 1,
    },
});

export default Home;