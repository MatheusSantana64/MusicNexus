// This file contains the Music screen component, which is responsible for rendering the Music screen components (SearchBar, SongList, FloatingButton, Modals).
// The Music screen allows users to search for songs, filter songs by rating, add new songs, edit song details, delete songs, and rate songs.

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
    // Define state variables
    const [searchText, setSearchText] = useState('');
    const [showUnrated, setShowUnrated] = useState(false);
    const [orderBy, setOrderBy] = useState('title');
    const [orderDirection, setOrderDirection] = useState('asc');

    const [songs, setSongs] = useState([]);
    const [selectedSong, setSelectedSong] = useState(null);
    const [ratingSong, setRatingSong] = useState(null);

    const [isModalVisible, setModalVisible] = useState(false);
    const [isSongOptionsVisible, setSongOptionsVisible] = useState(false);
    const [isRatingModalVisible, setRatingModalVisible] = useState(false);

    // Initialize the SQLite database
    useEffect(() => {
        initDatabase();
    }, []);

    // Fetch songs from the SQLite database with dynamic query and pagination
    const fetchSongs = async (searchText, showUnrated, orderBy, orderDirection) => {
        let query = 'SELECT * FROM songs';
        let params = [];

        // Add WHERE clause for search text
        if (searchText) {
            query += ' WHERE title LIKE ? OR artist LIKE ? OR album LIKE ?';
            params.push(`%${searchText}%`, `%${searchText}%`, `%${searchText}%`);
        }

        // Add WHERE clause for unrated songs
        if (showUnrated) {
            query += searchText ? ' AND rating = 0' : ' WHERE rating = 0';
        }

        // Add ORDER BY clause
        query += ' ORDER BY ' + orderBy + ' ' + orderDirection;

        db.transaction(tx => {
            tx.executeSql(
                query,
                params,
                (_, { rows: { _array } }) => {
                    console.log("Fetched songs:", _array);
                    setSongs(_array);
                },
                (_, error) => console.log('Error fetching songs:', error)
            );
        });
    };

    // Fetch songs on component mount and when the search text, show unrated, order by, or order direction changes
    useEffect(() => {
        fetchSongs(searchText, showUnrated, orderBy, orderDirection);
    }, [searchText, showUnrated, orderBy, orderDirection]);

    // Use useFocusEffect to call fetchSongs whenever the Music screen comes into focus
    useFocusEffect(
        React.useCallback(() => {
            fetchSongs(searchText, showUnrated, orderBy, orderDirection);
        }, [searchText, showUnrated, orderBy, orderDirection])
    );

    // Filter songs (Search and Filters)
    const filteredSongs = songs.filter(song => {
        const searchMatch = song.title.toLowerCase().includes(searchText.toLowerCase()) ||
            song.album.toLowerCase().includes(searchText.toLowerCase()) ||
            song.artist.toLowerCase().includes(searchText.toLowerCase());
        
        const isUnrated = showUnrated && song.rating === 0;
        
        return searchMatch && (!showUnrated || isUnrated);
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
        setModalVisible(true);
        setSelectedSong(null);
    };

    // Handle Form Submit (Add New Song)
    const handleFormSubmit = async (song) => {
        const newSong = { ...song, rating: 0 };

        // Add the new song to the SQLite database
        db.transaction(tx => {
            tx.executeSql(
                'INSERT INTO songs (title, artist, album, release, rating) VALUES (?, ?, ?, ?, ?)',
                [newSong.title, newSong.artist, newSong.album, newSong.release, newSong.rating],
                () => {
                    console.log('Song added successfully');
                    
                    setModalVisible(false);
                    
                    fetchSongs(searchText, showUnrated, orderBy, orderDirection);;
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
        const songWithIdAndRating = { ...updatedSong, id: selectedSong.id, rating: selectedSong.rating };

        const updatedSongs = songs.map(song => song.id === selectedSong.id ? songWithIdAndRating : song);
        setSongs(updatedSongs);

        db.transaction(tx => {
            tx.executeSql(
                'UPDATE songs SET title = ?, artist = ?, album = ?, release = ?, rating = ? WHERE id = ?',
                [songWithIdAndRating.title, songWithIdAndRating.artist, songWithIdAndRating.album, songWithIdAndRating.release, songWithIdAndRating.rating, songWithIdAndRating.id],
                () => {
                    console.log('Song updated successfully');
                    setModalVisible(false);
                    setSongOptionsVisible(false);
                    setSelectedSong(null);
                },
                (_, error) => console.log('Error updating song:', error)
            );
        });
    };

    // Handle Edit Press (Edit Song Details)
    const handleEditPress = (song) => {
        setSelectedSong(song);
        setSongOptionsVisible(true);
    };

    // Handle Rating Select (Update Song Rating)
    const handleRatingSelect = (rating) => {
        db.transaction(tx => {
            tx.executeSql(
                'UPDATE songs SET rating = ? WHERE id = ?',
                [rating, ratingSong.id],
                () => {
                    console.log('Song rating updated successfully');
                    const updatedSongs = songs.map(song => song.id === ratingSong.id ? { ...song, rating } : song);
                    setSongs(updatedSongs);
                    setRatingModalVisible(false);
                    setRatingSong(null);
                },
                (_, error) => console.log('Error updating song rating:', error)
            );
        });
    };

    // Render the Music screen components (SearchBar, SongList, FloatingButton, Modals)
    return (
        <View style={{ flex: 1, alignItems: 'center', backgroundColor: '#090909', paddingHorizontal: 16, paddingTop: 16 }}>
            <SearchBar
                searchText={searchText}
                setSearchText={setSearchText}
                showUnrated={showUnrated}
                setShowUnrated={setShowUnrated}
                setOrderBy={setOrderBy}
                setOrderDirection={setOrderDirection}
            />

            <SongList
                sortedSongs={sortedSongs}
                handleCardPress={handleCardPress}
                handleEditPress={handleEditPress}
                handleLongPress={handleLongPress}
                orderBy={orderBy}
                orderDirection={orderDirection}
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

            {ratingSong && (
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
