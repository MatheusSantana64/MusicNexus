// This file is the home screen of the application. It displays the list of not rated songs (rating = 0) and favorite songs (rating >= 8).
// It also allows users to search for songs online and add it to their list.

// Home.js
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import SongList from '../components/SongList';
import { fetchSongs } from '../database/databaseOperations';
import SearchBar from '../components/SearchBar';
import OrderButtons from '../components/OrderButtons';
import { useFocusEffect } from '@react-navigation/native';

export function Home() {
    const [favoriteSongs, setFavoriteSongs] = useState([]);
    const [notRatedSongs, setNotRatedSongs] = useState([]);
    const [orderFav, setOrderFav] = useState('rating');
    const [orderDirectionFav, setOrderDirectionFav] = useState('desc');
    const [orderNotRated, setOrderNotRated] = useState('release');
    const [orderDirectionNotRated, setOrderDirectionNotRated] = useState('asc');

    useFocusEffect(
        React.useCallback(() => {
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
        // Implement fetchSongsOnline in MusicBrainzAPI.js
        // This function should return an array of songs that match the search criteria
        // const results = await fetchSongsOnline(searchText);
        // setSearchResults(results);
    };

    return (
        <View style={styles.screen}>
            <SearchBar 
                onSearch={handleSearch}
                showFilters={false}
            />
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
        paddingHorizontal: 16,
        paddingTop: 16,
    },
});

export default Home;