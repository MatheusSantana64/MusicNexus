// This file is the home screen of the application. It displays the list of not rated songs (rating = 0) and favorite songs (rating >= 8).
// It also allows users to search for songs online and add it to their list.

// Home.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useFocusEffect, useNavigation  } from '@react-navigation/native';
import { initDatabase } from '../database/databaseSetup';

import { fetchSongs } from '../database/databaseOperations';
import SongList from '../components/SongList';
import OrderButtons from '../components/OrderButtons';

import OnlineSearchBar from '../components/OnlineSearchBar';
import { fetchSongsOnline } from '../api/MusicBrainzAPI';

import AsyncStorage from '@react-native-async-storage/async-storage';

export function Home() {
    const [favoriteSongs, setFavoriteSongs] = useState([]);
    const [orderFav, setOrderFav] = useState('rating');
    const [orderDirectionFav, setOrderDirectionFav] = useState('desc');
    
    const [notRatedSongs, setNotRatedSongs] = useState([]);
    const [orderNotRated, setOrderNotRated] = useState('release');
    const [orderDirectionNotRated, setOrderDirectionNotRated] = useState('asc');

    // Initialize the SQLite database
    useEffect(() => {
        initDatabase();
    }, []);

    useFocusEffect(
        React.useCallback(() => {
            const loadSettings = async () => {
                global.showCovers = await AsyncStorage.getItem('@music_nexus_show_covers');
                console.log('global.showCovers:', global.showCovers);
                global.downloadCovers = await AsyncStorage.getItem('@music_nexus_download_covers');
                console.log('global.downloadCovers:', global.downloadCovers);
            };

            loadSettings();

            const fetchSongsWrapper = async () => {
                const songsFav = await fetchSongs('', orderFav, orderDirectionFav, 0, false, { min: 5, max: 10 });
                setFavoriteSongs(songsFav);
                const songsNotRated = await fetchSongs('', orderNotRated, orderDirectionNotRated, 0, false, { min: 0, max: 0 });
                setNotRatedSongs(songsNotRated);
            };

            fetchSongsWrapper();
        }, [orderFav, orderDirectionFav, orderNotRated, orderDirectionNotRated])
    );

    const handleSearch = async (searchText) => {
        // List songs from MusicBrainz API based on the search text
    };
    
    return (
        <View style={styles.screen}>
            <View style={styles.titleContainer}>
                <Text style={styles.title}>Favorite Songs</Text>
                <OrderButtons
                    order={orderFav}
                    setOrder={setOrderFav}
                    orderDirection={orderDirectionFav}
                    setOrderDirection={setOrderDirectionFav}
                />
            </View>
            <SongList songs={favoriteSongs} setSongs={setFavoriteSongs} />

            <View style={styles.titleContainer}>
                <Text style={styles.title}>Not Rated Songs</Text>
                <OrderButtons
                    order={orderNotRated}
                    setOrder={setOrderNotRated}
                    orderDirection={orderDirectionNotRated}
                    setOrderDirection={setOrderDirectionNotRated}
                />
            </View>
            <SongList songs={notRatedSongs} setSongs={setNotRatedSongs} />
        </View>
    );
}

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
    orderButtonsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    orderButton: {
        marginLeft: 10,
    },
    orderDirectionButton: {
        marginLeft: 10,
    },
    screen: {
        flex: 1,
        backgroundColor: '#090909',
        paddingTop: 4,
    },
});

export default Home;