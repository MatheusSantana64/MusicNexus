// This file contains the Music screen component, which is responsible for rendering the Music screen components (SearchBar, SongList, FloatingButton, Modals).
// The Music screen allows users to search for songs, filter songs by rating, add new songs, edit song details, delete songs, and rate songs.
// The screen uses SQLite to store and retrieve song data, and it uses modals for adding, editing, and rating songs.

import React, { useState, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Alert } from 'react-native';
import { initDatabase, db } from '../databaseSetup';
import SearchBar from '../components/SearchBar';
import SongList from '../components/SongList';
import FloatingButton from '../components/FloatingButton';
import SongFormModal from '../components/SongFormModal';
import SongOptionsModal from '../components/SongOptionsModal';
import RatingModal from '../components/RatingModal';

export function Music() {
    const [searchText, setSearchText] = useState(''); // State for search text
    const [showUnrated, setShowUnrated] = useState(false); // State for showing unrated songs
    const [orderBy, setOrderBy] = useState('title'); // Default order is by title
    const [orderDirection, setOrderDirection] = useState('asc'); // Default to ascending
    
    const [songs, setSongs] = useState([]); // State for songs array
    const [selectedSong, setSelectedSong] = useState(null); // State for selected song to edit
    const [ratingSong, setRatingSong] = useState(null); // State for the song being rated
    
    const [isModalVisible, setModalVisible] = useState(false); // State for SongFormModal visibility
    const [isSongOptionsVisible, setSongOptionsVisible] = useState(false); // State for SongOptionsModal visibility
    const [isRatingModalVisible, setRatingModalVisible] = useState(false); // State for RatingModal visibility

    useEffect(() => {   // Use useEffect to initialize the database when the component mounts
        initDatabase(); // Call the initDatabase function to create the songs table
    }, []);             // Empty dependency array to run the effect only once

    // Fetch songs from the SQLite database
    const fetchSongs = async () => {    // Define an async function to fetch songs
        db.transaction(tx => {          // Start a database transaction
            tx.executeSql(              // Execute SQL query to fetch all songs
                'SELECT * FROM songs',  // Query to fetch all songs
                [],                     // No parameters
                (_, { rows: { _array } }) => {              // Success callback
                    console.log("Fetched songs:", _array);  // Debugging statement
                    setSongs(_array);                       // Update the songs state with the fetched songs
                },
                (_, error) => console.log('Error fetching songs:', error) // Error callback
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

    // Sort songs based on the selected order and direction
    const sortSongs = (songs, orderDirection) => {
        let sortedSongs = [...songs];
        switch (orderBy) {
            case 'artist':
                sortedSongs.sort((a, b) => a.artist.localeCompare(b.artist));
                break;
            case 'release':
                sortedSongs.sort((a, b) => new Date(a.release) - new Date(b.release));
                break;
            case 'rating':
                sortedSongs.sort((a, b) => b.rating - a.rating);
                break;
            default:
                sortedSongs.sort((a, b) => a.title.localeCompare(b.title));
        }
        return orderDirection === 'desc' ? sortedSongs.reverse() : sortedSongs;
    };    

    // Sort the filtered songs based on the selected order and direction
    const sortedSongs = sortSongs(filteredSongs, orderDirection);

    // Press Floating Button (Add New Song)
    const handleFloatButtonPress = () => {
        setModalVisible(true); // Show the SongFormModal
        setSelectedSong(null); // Clear the selected song
    };

    // Handle Form Submit (Add New Song)
    const handleFormSubmit = async (song) => {
        const newSong = { ...song, rating: 0 }; // Assuming rating is 0 for new songs

        // Add the new song to the SQLite database
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

    // Handle Card Press (Show Rating Modal)
    const handleCardPress = (song) => {
        setRatingSong(song);
        setRatingModalVisible(true);
    };

    // Handle Long Press (Show Edit/Delete Modal)
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
                searchText={searchText}                 // Pass the searchText state (Search Text)
                setSearchText={setSearchText}           // Pass the setSearchText function (Update Search Text)
                showUnrated={showUnrated}               // Pass the showUnrated state (Toggle Filter)
                setShowUnrated={setShowUnrated}         // Pass the setShow Unrated function (Toggle Filter)
                setOrderBy={setOrderBy}                 // Pass the setOrderBy function (Update Order)
                setOrderDirection={setOrderDirection}   // Pass the setOrderDirection function (Update Order)
            />

            <SongList
                sortedSongs={sortedSongs}         // Pass the sortedSongs array (Search and Filters)
                handleCardPress={handleCardPress}   // Pass the handleCardPress function (Rating)
                handleEditPress={handleEditPress}   // Pass the handleEditPress function (Edit Song Details)
                handleLongPress={handleLongPress}   // Pass the handleLongPress function (Edit/Delete)
                orderBy={orderBy}                   // Pass the orderBy state here
                orderDirection={orderDirection}     // Pass the orderDirection state
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

            {ratingSong && (                                        // Only render RatingModal if ratingSong is not null
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
