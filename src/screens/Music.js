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
const DATA_FILE = 'musicnexus_data.json'; // File name for json data file
const SAVE_PATH = FileSystem.documentDirectory; // Path for json data file
const fileUri = SAVE_PATH + DATA_FILE; // Full path for json data file

export function Music() {
    const [searchText, setSearchText] = useState('');
    const [showUnrated, setShowUnrated] = useState(false);
    const [isModalVisible, setModalVisible] = useState(false);
    const [songs, setSongs] = useState([]);
    const [selectedSong, setSelectedSong] = useState(null);
    const [isSongOptionsVisible, setSongOptionsVisible] = useState(false);
    const [isRatingModalVisible, setRatingModalVisible] = useState(false); // State for RatingModal
    const [ratingSong, setRatingSong] = useState(null); // State for the song being rated

    // Load songs from file system
    useEffect(() => {
        const fetchSongs = async () => {
            const fileInfo = await FileSystem.getInfoAsync(fileUri);
            if (!fileInfo.exists) {
                await FileSystem.writeAsStringAsync(fileUri, JSON.stringify([]));
            }

            const result = await FileSystem.readAsStringAsync(fileUri);
            if (result) {
                setSongs(JSON.parse(result));
            }
        };

        fetchSongs();
    }, []);

    const filteredSongs = songs.filter(song => {
        const searchMatch = song.title.toLowerCase().includes(searchText.toLowerCase()) ||
            song.album.toLowerCase().includes(searchText.toLowerCase()) ||
            song.artist.toLowerCase().includes(searchText.toLowerCase());
        
        // Adjust the condition to consider songs with a rating of 0 as unrated
        const isUnrated = showUnrated && song.rating === 0;
        
        return searchMatch && (!showUnrated || isUnrated);
    });

    const handleFloatButtonPress = () => {
        setModalVisible(true);
        setSelectedSong(null);
    };

    const [lastId, setLastId] = useState(0);

    const handleFormSubmit = async (song) => {
        const newSong = { ...song, id: lastId + 1, rating: 0 }; // Set rating to 0 for new songs
        const newSongs = [...songs, newSong];
        setSongs(newSongs);
        setLastId(lastId + 1);
        await FileSystem.writeAsStringAsync(SAVE_PATH + DATA_FILE, JSON.stringify(newSongs));
        setModalVisible(false);
    };

    const handleCardPress = (song) => {
        setRatingSong(song);
        setRatingModalVisible(true);
    };

    const handleLongPress = (song) => {
        setSelectedSong(song);
        setSongOptionsVisible(true);
    };    

    const handleEditSong = () => {
        setModalVisible(true);
    };

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
                        const updatedSongs = songs.filter(song => song.id !== selectedSong.id);
                        setSongs(updatedSongs);
                        await FileSystem.writeAsStringAsync(SAVE_PATH + DATA_FILE, JSON.stringify(updatedSongs));
                        setSongOptionsVisible(false);
                        setSelectedSong(null);
                    }
                }
            ],
            { cancelable: false }
        );
    };

    const handleEditFormSubmit = async (updatedSong) => {
        // Find the original song in the songs array to preserve its rating
        const originalSong = songs.find(song => song.id === selectedSong.id);
        // Preserve the original rating if it exists, otherwise use the updated song's rating
        const preservedRating = originalSong ? originalSong.rating : updatedSong.rating;
        // Create a new song object with the updated details but keep the original rating
        const updatedSongWithRating = { ...updatedSong, id: selectedSong.id, rating: preservedRating };
        // Replace the original song with the updated song in the songs array (Preserve the original id)
        const updatedSongs = songs.map(song => song.id === selectedSong.id ? updatedSongWithRating : song);
        // Update the state with the updated songs array
        setSongs(updatedSongs);
        // Write the updated songs array to the file system
        await FileSystem.writeAsStringAsync(SAVE_PATH + DATA_FILE, JSON.stringify(updatedSongs));
        // Close the modal
        setModalVisible(false);
        // Clear the selected song
        setSongOptionsVisible(false);
        setSelectedSong(null);
    };

    const handleEditPress = (song) => {
        setSelectedSong(song);
        setSongOptionsVisible(true);
    };

    const handleRatingSelect = (rating) => {
        const updatedSongs = songs.map(song => song.id === ratingSong.id ? { ...song, rating } : song);
        setSongs(updatedSongs);
        setRatingModalVisible(false);
        setRatingSong(null);
        FileSystem.writeAsStringAsync(SAVE_PATH + DATA_FILE, JSON.stringify(updatedSongs));
    };

    return (
        <View style={{ flex: 1, alignItems: 'center', backgroundColor: '#090909', padding: 16 }}>
            <SearchBar
                searchText={searchText}
                setSearchText={setSearchText}
                showUnrated={showUnrated}
                setShowUnrated={setShowUnrated}
            />
            <SongList
                filteredSongs={filteredSongs}
                handleCardPress={handleCardPress}
                handleEditPress={handleEditPress}
                handleLongPress={handleLongPress}
            />
            <FloatingButton onPress={handleFloatButtonPress} />
            <SongFormModal
                isModalVisible={isModalVisible}
                setModalVisible={setModalVisible}
                selectedSong={selectedSong}
                handleFormSubmit={handleFormSubmit}
                handleEditFormSubmit={handleEditFormSubmit}
                onCancel={() => setModalVisible(false)}
            />
            <SongOptionsModal
                isSongOptionsVisible={isSongOptionsVisible}
                setSongOptionsVisible={setSongOptionsVisible}
                handleEditSong={handleEditSong}
                handleDeleteSong={handleDeleteSong}
            />
            {ratingSong && ( // Only render RatingModal if ratingSong is not null
                <RatingModal
                    isVisible={isRatingModalVisible}
                    onClose={() => setRatingModalVisible(false)}
                    onRatingSelect={handleRatingSelect}
                    selectedSong={ratingSong}
                />
            )}
        </View>
    );
}
