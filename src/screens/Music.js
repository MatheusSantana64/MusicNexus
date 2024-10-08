// This file contains the Music screen component, which is responsible for rendering the Music screen components (SearchBar, SongList, FloatingButton, Modals).
// The Music screen allows users to search for songs, filter songs by rating, add new songs, edit song details, delete songs, and rate songs.

import React, { useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View } from 'react-native';
import SearchBar from '../components/SearchBar';
import SongList from '../components/SongList';
import FloatingButton from '../components/FloatingButton';
import { fetchSongs } from '../database/databaseOperations';
import { globalStyles } from '../styles/global';

const OFFSET_SIZE = 100;

export function Music() {
    // Define state variables
    const [searchText, setSearchText] = useState('');
    const [orderBy, setOrderBy] = useState('release');
    const [orderDirection, setOrderDirection] = useState('desc');
    const [ratingRange, setRatingRange] = useState({ min: 0, max: 10 });

    const [songs, setSongs] = useState([]);

    const [offset, setOffset] = useState(0);
    const [hasMoreSongs, setHasMoreSongs] = useState(true);

    // Fetch songs from the SQLite database with dynamic query and pagination
    const fetchSongsWrapper = async (searchText, orderBy, orderDirection, offset = 0, isScroll = false, ratingRange = { min: 0, max: 10 }) => {
        // If not in scroll mode, reset the songs and offset
        if (!isScroll) {
            setSongs([]);
            setOffset(0);
        }
        // Fetch songs from the SQLite database
        const fetchedSongs = await fetchSongs(searchText, orderBy, orderDirection, offset, isScroll, ratingRange);
        if (isScroll) {
            setSongs(prevSongs => [...prevSongs, ...fetchedSongs]);
        } else {
            setSongs(fetchedSongs);
        }
        setHasMoreSongs(fetchedSongs.length >= OFFSET_SIZE);
    };

    // Fetch more songs when the user scrolls down the list
    const fetchMoreSongs = () => {
        const newOffset = offset + OFFSET_SIZE;
        fetchSongsWrapper(searchText, orderBy, orderDirection, newOffset, true, ratingRange);
        setOffset(newOffset);
    };

    // Fetch songs when the screen is focused
    useFocusEffect(
        React.useCallback(() => {
            fetchSongsWrapper(searchText, orderBy, orderDirection, 0, false, ratingRange);
        }, [searchText, orderBy, orderDirection, ratingRange])
    );

    // Function to refresh the songs list
    const refreshSongsList = () => {
        fetchSongsWrapper(searchText, orderBy, orderDirection, 0, false, ratingRange);
    };

    // Render the Music screen components (SearchBar, SongList, FloatingButton, Modals)
    return (
        <View style={{ flex: 1, backgroundColor: globalStyles.black1}}>
            <View style={{ marginHorizontal: 10, marginTop: 16 }}>
                <SearchBar
                    searchText={searchText}
                    setSearchText={setSearchText}
                    setOrderBy={setOrderBy}
                    setOrderDirection={setOrderDirection}
                    ratingRange={ratingRange}
                    setRatingRange={setRatingRange}
                    showFilters={true}
                />
            </View>

            <SongList
                songs={songs}
                fetchMoreSongs={fetchMoreSongs}
                hasMoreSongs={hasMoreSongs}
                setSongs={setSongs}
                refreshSongsList={refreshSongsList}
            />

            <FloatingButton
                songs={songs}
                setSongs={setSongs}
                refreshSongsList={refreshSongsList}
            />
        </View>
    );
}
