// This file contains the Music screen component, which is responsible for rendering the Music screen components (SearchBar, SongList, FloatingButton, Modals).
// The Music screen allows users to search for songs, filter songs by rating, add new songs, edit song details, delete songs, and rate songs.
// The screen uses SQLite to store and retrieve song data, and it uses modals for adding, editing, and rating songs.

import React, { useState, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Alert } from 'react-native';
import * as SQLite from 'expo-sqlite';
import SearchBar from '../components/SearchBar';
import SongList from '../components/SongList';
import FloatingButton from '../components/FloatingButton';
import SongFormModal from '../components/SongFormModal';
import SongOptionsModal from '../components/SongOptionsModal';
import RatingModal from '../components/RatingModal';

// Open or create the database
const db = SQLite.openDatabase('musicnexus.db');

// Initialize the database with necessary tables
const initDatabase = () => {
    db.transaction(tx => {
        // Create songs table
        tx.executeSql(`
            CREATE TABLE IF NOT EXISTS songs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                artist TEXT NOT NULL,
                album TEXT NOT NULL,
                release TEXT NOT NULL,
                rating INTEGER NOT NULL
            );
        `);
    }, (error) => {
        console.log("Error initializing database: ", error);
    });
};

export function Music() {
    const [searchText, setSearchText] = useState(''); // State for search text
    const [showUnrated, setShowUnrated] = useState(false); // State for showing unrated songs
    
    const [songs, setSongs] = useState([]); // State for songs array
    const [selectedSong, setSelectedSong] = useState(null); // State for selected song to edit
    const [ratingSong, setRatingSong] = useState(null); // State for the song being rated
    
    const [isModalVisible, setModalVisible] = useState(false); // State for SongFormModal visibility
    const [isSongOptionsVisible, setSongOptionsVisible] = useState(false); // State for SongOptionsModal visibility
    const [isRatingModalVisible, setRatingModalVisible] = useState(false); // State for RatingModal visibility

    useEffect(() => {
        initDatabase();
    }, []);

    // Fetch songs from the SQLite database
    const fetchSongs = async () => {
        db.transaction(tx => {
            tx.executeSql(
                'SELECT * FROM songs',
                [],
                (_, { rows: { _array } }) => {
                    console.log("Fetched songs:", _array); // Debugging statement
                    setSongs(_array);
                },
                (_, error) => console.log('Error fetching songs:', error)
            );
        });
    };

    // Use useFocusEffect to refresh songs when the screen comes into focus
    useFocusEffect(
        React.useCallback(() => {
            fetchSongs();
        }, [])
    );

    // Filter songs (Search and Filters)
    const filteredSongs = songs.filter(song => {
        const searchMatch = song.title.toLowerCase().includes(searchText.toLowerCase()) ||
            song.album.toLowerCase().includes(searchText.toLowerCase()) ||
            song.artist.toLowerCase().includes(searchText.toLowerCase()); // Check if the song's title, album, or artist contains the search text
        
        const isUnrated = showUnrated && song.rating === 0; // Check if the song is unrated and the filter is enabled
        
        return searchMatch && (!showUnrated || isUnrated); // Return the song if it matches the search and filter criteria
    });

    // Press Floating Button (Add New Song)
    const handleFloatButtonPress = () => {
        setModalVisible(true); // Show the SongFormModal
        setSelectedSong(null); // Clear the selected song
    };

    // Handle Form Submit (Add New Song)
    const handleFormSubmit = async (song) => {
        const newSong = { ...song, rating: 0 }; // Assuming rating is 0 for new songs

        db.transaction(tx => {
            tx.executeSql(
                'INSERT INTO songs (title, artist, album, release, rating) VALUES (?, ?, ?, ?, ?)',
                [newSong.title, newSong.artist, newSong.album, newSong.release, newSong.rating],
                () => {
                    console.log('Song added successfully');
                    // Close the modal
                    setModalVisible(false);
                    // Refresh the list of songs
                    fetchSongs();
                },
                (_, error) => console.log('Error adding song:', error)
            );
        });
    };

    // Handle Card Press (Rating)
    const handleCardPress = (song) => {
        setRatingSong(song);
        setRatingModalVisible(true);
    };

    // Handle Long Press (Edit/Delete)
    const handleLongPress = (song) => {
        setSelectedSong(song);
        setSongOptionsVisible(true);
    };    

    // Handle Edit Song (Edit Song Details)
    const handleEditSong = () => {
        setModalVisible(true);
    };

    // Handle Delete Song (Delete Song)
    const handleDeleteSong = () => {
        if (!selectedSong) return;
    
        Alert.alert(
            "Delete Song",
            `Are you sure you want to delete "${selectedSong.title}"?`,
            [
                {
                    text: "Cancel",
                    onPress: () => console.log("Cancel Pressed"),
                    style: "cancel"
                },
                {
                    text: "Delete",
                    onPress: async () => {
                        db.transaction(tx => {
                            tx.executeSql(
                                'DELETE FROM songs WHERE id = ?',
                                [selectedSong.id],
                                () => {
                                    const updatedSongs = songs.filter(song => song.id !== selectedSong.id);
                                    setSongs(updatedSongs);
                                    setSongOptionsVisible(false);
                                    setSelectedSong(null);
                                },
                                (_, error) => console.log('Error deleting song:', error)
                            );
                        });
                    }
                }
            ],
            { cancelable: true }
        );
    };

    // Handle Edit Form Submit (Update Song Details)
    const handleEditFormSubmit = async (updatedSong) => {
        // Ensure the updatedSong object includes the id and rating
        const songWithIdAndRating = { ...updatedSong, id: selectedSong.id, rating: selectedSong.rating };

        // Update the songs state with the updated song
        const updatedSongs = songs.map(song => song.id === selectedSong.id ? songWithIdAndRating : song);
        setSongs(updatedSongs);

        // Update the song in the SQLite database
        db.transaction(tx => {
            tx.executeSql(
                'UPDATE songs SET title = ?, artist = ?, album = ?, release = ?, rating = ? WHERE id = ?',
                [songWithIdAndRating.title, songWithIdAndRating.artist, songWithIdAndRating.album, songWithIdAndRating.release, songWithIdAndRating.rating, songWithIdAndRating.id],
                () => {
                    console.log('Song updated successfully');
                    setModalVisible(false); // Close the modal
                    setSongOptionsVisible(false); // Close the song options modal if open
                    setSelectedSong(null); // Clear the selected song
                },
                (_, error) => console.log('Error updating song:', error)
            );
        });
    };

    // Handle Edit Press (Edit Song Details)
    const handleEditPress = (song) => {
        setSelectedSong(song);          // Set the selected song
        setSongOptionsVisible(true);    // Show the SongOptionsModal
    };

    // Handle Rating Select (Update Song Rating)
    const handleRatingSelect = (rating) => {
        // Update the rating of the selected song in the SQLite database
        db.transaction(tx => {
            tx.executeSql(
                'UPDATE songs SET rating = ? WHERE id = ?',
                [rating, ratingSong.id],
                () => {
                    // Update the songs state with the updated rating
                    console.log('Song rating updated successfully');
                    const updatedSongs = songs.map(song => song.id === ratingSong.id ? { ...song, rating } : song);
                    setSongs(updatedSongs);

                    // Close the RatingModal and clear the rating song
                    setRatingModalVisible(false);
                    setRatingSong(null);
                },
                (_, error) => console.log('Error updating song rating:', error)
            );
        });
    };

    // Render the Music screen components (SearchBar, SongList, FloatingButton, Modals)
    return (
        <View style={{ flex: 1, alignItems: 'center', backgroundColor: '#090909', padding: 16 }}>
            <SearchBar
                searchText={searchText}         // Pass the searchText state (Search Text)
                setSearchText={setSearchText}   // Pass the setSearchText function (Update Search Text)
                showUnrated={showUnrated}       // Pass the showUnrated state (Toggle Filter)
                setShowUnrated={setShowUnrated} // Pass the setShow Unrated function (Toggle Filter)
            />

            <SongList
                filteredSongs={filteredSongs}       // Pass the filteredSongs array (Search and Filters)
                handleCardPress={handleCardPress}   // Pass the handleCardPress function (Rating)
                handleEditPress={handleEditPress}   // Pass the handleEditPress function (Edit Song Details)
                handleLongPress={handleLongPress}   // Pass the handleLongPress function (Edit/Delete)
            />

            <FloatingButton onPress={handleFloatButtonPress} />

            <SongFormModal
                isModalVisible={isModalVisible}             // Pass the isModalVisible state (Show/Hide Modal)
                setModalVisible={setModalVisible}           // Pass the setModalVisible function (Show/Hide Modal)
                selectedSong={selectedSong}                 // Pass the selectedSong state (Song to Edit)
                handleFormSubmit={handleFormSubmit}         // Pass the handleFormSubmit function (Add New Song)
                handleEditFormSubmit={handleEditFormSubmit} // Pass the handleEditFormSubmit function (Update Song Details)
                onCancel={() => setModalVisible(false)}     // Pass the onCancel function (Close Modal)
            />

            <SongOptionsModal
                isSongOptionsVisible={isSongOptionsVisible}     // Pass the isSongOptionsVisible state (Show/Hide Modal)
                setSongOptionsVisible={setSongOptionsVisible}   // Pass the setSongOptionsVisible function (Show/Hide Modal)
                handleEditSong={handleEditSong}                 // Pass the handleEditSong function (Edit Song Details)
                handleDeleteSong={handleDeleteSong}             // Pass the handleDeleteSong function (Delete Song)
            />

            {ratingSong && ( // Only render RatingModal if ratingSong is not null
                <RatingModal
                    isVisible={isRatingModalVisible}                // Pass the isRatingModalVisible state (Show/Hide Modal)
                    onClose={() => setRatingModalVisible(false)}    // Pass the setRatingModalVisible function (Show/Hide Modal)
                    onRatingSelect={handleRatingSelect}             // Pass the handleRatingSelect function (Update Song Rating)
                    selectedSong={ratingSong}                       // Pass the ratingSong state (Song to Rate)
                />
            )}
        </View>
    );
}
