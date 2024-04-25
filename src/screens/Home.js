// This file is the home screen of the application. It displays the list of not rated songs (rating = 0) and favorite songs (rating >= 8).
// It also allows users to search for songs online and add it to their list.

import React, { useState, useEffect } from 'react';
import { View, TextInput, Button, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { fetchAlbumCover } from '../api/MusicBrainzAPI';
import { initDatabase, db } from '../database/databaseSetup';
import SongList from '../components/SongList';
import SongFormModal from '../components/SongFormModal';

export function Home() {
    const [searchText, setSearchText] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isModalVisible, setModalVisible] = useState(false);
    const [selectedSong, setSelectedSong] = useState(null);

    useEffect(() => {
        initDatabase();
    }, []);

    const handleSearch = async () => {
        // Placeholder for the search functionality
        // You would typically call an API to search for songs based on the searchText
        // For demonstration, we'll just simulate fetching data
        const results = await fetchAlbumCover(searchText); // This function should be implemented to fetch data from the MusicBrainz API
        setSearchResults(results);
    };

    const handleSongSelect = (song) => {
        setSelectedSong(song);
        setModalVisible(true);
    };

    const handleFormSubmit = async (song) => {
        db.transaction(tx => {
            tx.executeSql(
                'INSERT INTO songs (title, artist, album, release, rating, cover_path) VALUES (?, ?, ?, ?, ?, ?)',
                [song.title, song.artist, song.album, song.release, 0, ''],
                () => {
                    console.log('Song added successfully');
                    setModalVisible(false);
                    // Optionally, fetch the updated list of songs
                },
                (_, error) => console.log('Error adding song:', error)
            );
        });
    };

    return (
        <View style={styles.container}>
            <TextInput
                placeholder="Search for songs"
                value={searchText}
                onChangeText={setSearchText}
                style={styles.searchInput}
            />
            <Button title="Search" onPress={handleSearch} />
            <SongList
                songs={searchResults}
                handleCardPress={handleSongSelect}
                // Add other necessary props
            />
            <SongFormModal
                isModalVisible={isModalVisible}
                setModalVisible={setModalVisible}
                selectedSong={selectedSong}
                handleFormSubmit={handleFormSubmit}
                onCancel={() => setModalVisible(false)}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        backgroundColor: '#090909',
        paddingHorizontal: 16,
        paddingTop: 16,
    },
    searchInput: {
        height: 40,
        borderColor: 'gray',
        borderWidth: 1,
        width: '100%',
        marginBottom: 10,
        paddingLeft: 10,
        paddingRight: 10,
        color: 'white',
        backgroundColor: '#1e272e',
        borderRadius: 8,
    },
    // Add other styles as needed
});

export default Home;