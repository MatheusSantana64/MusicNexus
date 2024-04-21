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
    const [orderBy, setOrderBy] = useState('title');
    const [orderDirection, setOrderDirection] = useState('asc');
    const [ratingRange, setRatingRange] = useState({ min: 0, max: 10 });

    const [songs, setSongs] = useState([]);
    const [selectedSong, setSelectedSong] = useState(null);
    const [ratingSong, setRatingSong] = useState(null);

    const [isModalVisible, setModalVisible] = useState(false);
    const [isSongOptionsVisible, setSongOptionsVisible] = useState(false);
    const [isRatingModalVisible, setRatingModalVisible] = useState(false);

    const [offset, setOffset] = useState(0);
    const [hasMoreSongs, setHasMoreSongs] = useState(true);

    // Initialize the SQLite database
    useEffect(() => {
        initDatabase();
    }, []);

    // Fetch songs from the SQLite database with dynamic query and pagination
    const fetchSongs = async (searchText, orderBy, orderDirection, offset = 0, isScroll = false, ratingRange = { min: 0, max: 10 }) => {
        if (!isScroll) {
            setSongs([]);
            setOffset(0);
        }

        let query = 'SELECT * FROM songs';
        let params = [];
    
        // Split search text into individual words
        const searchWords = searchText.split(' '); 

        // Add WHERE clause for search text
        if (searchWords.length > 0) {
            query += ' WHERE ';
            const conditions = searchWords.map((word, index) => {
                const placeholder = `word${index}`;
                params.push(`%${word}%`, `%${word}%`, `%${word}%`);
                return `(title LIKE ? OR artist LIKE ? OR album LIKE ?)`;
            }).join(' AND ');
            query += conditions;
        }
    
        // Add WHERE clause for rating range
        if (ratingRange.min !== 0 || ratingRange.max !== 10) {
            query += ' AND rating >= ? AND rating <= ?';
            params.push(ratingRange.min, ratingRange.max);
        }
        
        // Add ORDER BY clause
        query += ' ORDER BY ' + orderBy + ' ' + orderDirection + ', title ASC';
    
        // Add LIMIT and OFFSET clauses
        query += ' LIMIT 100 OFFSET ?';
        params.push(offset);
    
        db.transaction(tx => {
            tx.executeSql(
                query,
                params,
                (_, { rows: { _array } }) => {
                    console.log("Fetched songs:", _array);
                    console.log("Executing SQL query:", query, "with parameters:", params);
                    setSongs(prevSongs => [...prevSongs, ..._array]);
                    setHasMoreSongs(_array.length >= 100);
                },
                (_, error) => console.log('Error fetching songs:', error)
            );
        });
    };    

    // Fetch more songs when the user scrolls down the list
    const fetchMoreSongs = () => {
        const newOffset = offset + 20;
        fetchSongs(searchText, orderBy, orderDirection, newOffset, true, ratingRange);
        setOffset(newOffset);
    };

    // Fetch songs when the screen is focused
    useFocusEffect(
        React.useCallback(() => {
            fetchSongs(searchText, orderBy, orderDirection, 0, false, ratingRange);
        }, [searchText, orderBy, orderDirection, ratingRange])
    );

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
                    
                    fetchSongs(searchText, showUnrated, orderBy, orderDirection, 0, false);
                },
                (_, error) => console.log('Error adding song:', error)
            );
        });
    };

    // Handle Card Press (Show Rating Modal)
    const handleCardPress = (song) => {
        console.log(`Song selected for rating: ${song.title} by ${song.artist}`);
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
                    console.log(`Song rating updated successfully for song: ${ratingSong.title} by ${ratingSong.artist}, New Rating: ${rating}`);
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
                setOrderBy={setOrderBy}
                setOrderDirection={setOrderDirection}
                ratingRange={ratingRange}
                setRatingRange={setRatingRange}            
            />

            <SongList
                songs={songs}
                handleCardPress={handleCardPress}
                handleEditPress={handleEditPress}
                handleLongPress={handleLongPress}
                orderBy={orderBy}
                orderDirection={orderDirection}
                fetchMoreSongs={fetchMoreSongs}
                hasMoreSongs={hasMoreSongs}
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
