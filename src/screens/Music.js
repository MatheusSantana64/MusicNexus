// This file contains the Music screen component, which is responsible for rendering the Music screen components (SearchBar, SongList, FloatingButton, Modals).
// The Music screen allows users to search for songs, filter songs by rating, add new songs, edit song details, delete songs, and rate songs.

import React, { useState, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View } from 'react-native';
import { initDatabase, db } from '../database/databaseSetup';
import SearchBar from '../components/SearchBar';
import SongList from '../components/SongList';
import FloatingButton from '../components/FloatingButton';

export function Music() {
    // Define state variables
    const [searchText, setSearchText] = useState('');
    const [orderBy, setOrderBy] = useState('title');
    const [orderDirection, setOrderDirection] = useState('asc');
    const [ratingRange, setRatingRange] = useState({ min: 0, max: 10 });

    const [songs, setSongs] = useState([]);

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

    // Refresh songs list
    const refreshSongsList = () => {
        fetchSongs(searchText, orderBy, orderDirection, 0, false, ratingRange);
    };

    // Fetch songs when the screen is focused
    useFocusEffect(
        React.useCallback(() => {
            fetchSongs(searchText, orderBy, orderDirection, 0, false, ratingRange);
        }, [searchText, orderBy, orderDirection, ratingRange])
    );

    // Render the Music screen components (SearchBar, SongList, FloatingButton, Modals)
    return (
        <View style={{ flex: 1, backgroundColor: '#090909', paddingHorizontal: 16, paddingTop: 16 }}>
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
                fetchMoreSongs={fetchMoreSongs}
                hasMoreSongs={hasMoreSongs}
                setSongs={setSongs}
            />

            <FloatingButton
                setSongs={setSongs}
                songs={songs}
            />
        </View>
    );
}
