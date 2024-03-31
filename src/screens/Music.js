import React, { useState, useEffect } from 'react';
import { View, Alert } from 'react-native';
import * as FileSystem from 'expo-file-system';
import SearchBar from '../components/SearchBar';
import SongList from '../components/SongList';
import FloatingButton from '../components/FloatingButton';
import SongFormModal from '../components/SongFormModal';
import SongOptionsModal from '../components/SongOptionsModal';
import RatingModal from '../components/RatingModal';

// Constants
const DATA_FILE = 'musicnexus_data.json';       // File name for json data file
const SAVE_PATH = FileSystem.documentDirectory; // Path for json data file
const fileUri = SAVE_PATH + DATA_FILE;          // Full path for json data file

export function Music() {
    const [searchText, setSearchText] = useState('');                       // State for search text
    const [showUnrated, setShowUnrated] = useState(false);                  // State for showing unrated songs
    
    const [songs, setSongs] = useState([]);                                 // State for songs array
    const [selectedSong, setSelectedSong] = useState(null);                 // State for selected song to edit
    const [ratingSong, setRatingSong] = useState(null);                     // State for the song being rated
    
    const [isModalVisible, setModalVisible] = useState(false);              // State for SongFormModal visibility
    const [isSongOptionsVisible, setSongOptionsVisible] = useState(false);  // State for SongOptionsModal visibility
    const [isRatingModalVisible, setRatingModalVisible] = useState(false);  // State for RatingModal visibility

    // Load songs from file system
    useEffect(() => {
        const fetchSongs = async () => {                                            // Async function to fetch songs
            const fileInfo = await FileSystem.getInfoAsync(fileUri);                // Check if the file exists
            if (!fileInfo.exists) {
                await FileSystem.writeAsStringAsync(fileUri, JSON.stringify([]));   // Create the file if it doesn't exist
            }

            const result = await FileSystem.readAsStringAsync(fileUri);             // Read the file contents
            if (result) {
                setSongs(JSON.parse(result));                                       // Parse the JSON data and set the songs state
            }
        };

        fetchSongs();                                                               // Call the async function
    }, []);

    // Filter songs (Search and Filters)
    const filteredSongs = songs.filter(song => {
        const searchMatch = song.title.toLowerCase().includes(searchText.toLowerCase()) ||
            song.album.toLowerCase().includes(searchText.toLowerCase()) ||
            song.artist.toLowerCase().includes(searchText.toLowerCase());   // Check if the song's title, album, or artist contains the search text
        
        const isUnrated = showUnrated && song.rating === 0;                 // Check if the song is unrated and the filter is enabled
        
        return searchMatch && (!showUnrated || isUnrated);                  // Return the song if it matches the search and filter criteria
    });

    // Press Floating Button (Add New Song)
    const handleFloatButtonPress = () => {
        setModalVisible(true);  // Show the SongFormModal
        setSelectedSong(null);  // Clear the selected song
    };

    // State for the last song id (Used to generate new song ids)
    const [lastId, setLastId] = useState(0);

    // Handle Form Submit (Add New Song)
    const handleFormSubmit = async (song) => {
        const newSong = { ...song, id: lastId + 1, rating: 0 }; // Set rating to 0 for new songs
        const newSongs = [...songs, newSong];                   // Add the new song to the songs array
        setSongs(newSongs);                                     // Update the songs state with the new songs array
        setLastId(lastId + 1);                                  // Update the last id state
        await FileSystem.writeAsStringAsync(SAVE_PATH + DATA_FILE, JSON.stringify(newSongs)); // Write the new songs array to the file system
        setModalVisible(false);                                 // Close the modal
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
        if (!selectedSong) return; // Return if no song is selected

        // Show an alert to confirm the deletion
        Alert.alert(
            "Delete Song",
            `Are you sure you want to delete "${selectedSong.title}"?`,
            [
                {
                    // Cancel button (Close the alert)
                    text: "Cancel",
                    onPress: () => console.log("Cancel Pressed"),
                    style: "cancel"
                },
                {
                    // Delete button (Delete the song from the songs array and write the updated array to the file system)
                    text: "Delete",
                    onPress: async () => {
                        const updatedSongs = songs.filter(song => song.id !== selectedSong.id); // Filter out the selected song
                        setSongs(updatedSongs); // Update the songs state with the updated songs array
                        await FileSystem.writeAsStringAsync(SAVE_PATH + DATA_FILE, JSON.stringify(updatedSongs)); // Write the updated songs array to the file system
                        setSongOptionsVisible(false); // Close the modal
                        setSelectedSong(null); // Clear the selected song
                    }
                }
            ],
            { cancelable: true } // Allow the alert to be dismissed by tapping outside of it
        );
    };

    // Handle Edit Form Submit (Update Song Details)
    const handleEditFormSubmit = async (updatedSong) => {
        const originalSong = songs.find(song => song.id === selectedSong.id); // Find the original song by id
        const preservedRating = originalSong ? originalSong.rating : updatedSong.rating; // Preserve the original rating if it exists
        const updatedSongWithRating = { ...updatedSong, id: selectedSong.id, rating: preservedRating }; // Preserve the original rating
        const updatedSongs = songs.map(song => song.id === selectedSong.id ? updatedSongWithRating : song); // Update the selected song
        setSongs(updatedSongs); // Update the songs state with the updated songs array
        await FileSystem.writeAsStringAsync(SAVE_PATH + DATA_FILE, JSON.stringify(updatedSongs)); // Write the updated songs array to the file system

        // Close the modal and clear the selected song
        setModalVisible(false);         // Close the modal
        setSongOptionsVisible(false);   // Close the SongOptionsModal
        setSelectedSong(null);          // Clear the selected song
    };

    // Handle Edit Press (Edit Song Details)
    const handleEditPress = (song) => {
        setSelectedSong(song);          // Set the selected song
        setSongOptionsVisible(true);    // Show the SongOptionsModal
    };

    // Handle Rating Select (Update Song Rating)
    const handleRatingSelect = (rating) => {
        const updatedSongs = songs.map(song => song.id === ratingSong.id ? { ...song, rating } : song); // Update the rating of the selected song
        setSongs(updatedSongs); // Update the songs state with the updated songs array

        // Close the RatingModal and clear the rating song
        setRatingModalVisible(false);
        setRatingSong(null);
        
        // Write the updated songs array to the file system
        FileSystem.writeAsStringAsync(SAVE_PATH + DATA_FILE, JSON.stringify(updatedSongs));
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
