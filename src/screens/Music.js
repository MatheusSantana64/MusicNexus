import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View } from 'react-native';
import SearchBar from '../components/SearchBar';
import SongList from '../components/SongList';
import FloatingButton from '../components/FloatingButton';
import { fetchSongs } from '../database/databaseOperations';
import { globalStyles } from '../styles/global';

const OFFSET_SIZE = 100;

export function Music() {
    const [searchText, setSearchText] = useState('');
    const [orderBy, setOrderBy] = useState('release');
    const [orderDirection, setOrderDirection] = useState('desc');
    const [ratingRange, setRatingRange] = useState({ min: 0, max: 10 });
    const [songs, setSongs] = useState([]);
    const [offset, setOffset] = useState(0);
    const [hasMoreSongs, setHasMoreSongs] = useState(true);
    
    // Add ref to track if initial data has been loaded
    const isInitialLoadDone = useRef(false);

    const fetchSongsWrapper = useCallback(async (searchText, orderBy, orderDirection, offset = 0, isScroll = false, ratingRange = { min: 0, max: 10 }) => {
        if (!isScroll) {
            setSongs([]);
            setOffset(0);
        }
        const fetchedSongs = await fetchSongs(searchText, orderBy, orderDirection, offset, isScroll, ratingRange);
        setSongs(prevSongs => (isScroll ? [...prevSongs, ...fetchedSongs] : fetchedSongs));
        setHasMoreSongs(fetchedSongs.length >= OFFSET_SIZE);
    }, []);

    const fetchMoreSongs = useCallback(() => {
        const newOffset = offset + OFFSET_SIZE;
        fetchSongsWrapper(searchText, orderBy, orderDirection, newOffset, true, ratingRange);
        setOffset(newOffset);
    }, [offset, searchText, orderBy, orderDirection, ratingRange, fetchSongsWrapper]);

    // Initial data load using useEffect
    useEffect(() => {
        if (!isInitialLoadDone.current) {
            fetchSongsWrapper(searchText, orderBy, orderDirection, 0, false, ratingRange);
            isInitialLoadDone.current = true;
        }
    }, []);

    // Only reload when search params change, not on every focus
    useEffect(() => {
        if (isInitialLoadDone.current) {
            fetchSongsWrapper(searchText, orderBy, orderDirection, 0, false, ratingRange);
        }
    }, [searchText, orderBy, orderDirection, ratingRange]);

    const refreshSongsList = useCallback(() => {
        fetchSongsWrapper(searchText, orderBy, orderDirection, 0, false, ratingRange);
    }, [searchText, orderBy, orderDirection, ratingRange, fetchSongsWrapper]);

    const searchBarProps = useMemo(() => ({
        searchText,
        setSearchText,
        setOrderBy,
        setOrderDirection,
        ratingRange,
        setRatingRange,
        showFilters: true
    }), [searchText, setSearchText, setOrderBy, setOrderDirection, ratingRange, setRatingRange]);

    const songListProps = useMemo(() => ({
        songs,
        fetchMoreSongs,
        hasMoreSongs,
        setSongs,
        refreshSongsList
    }), [songs, fetchMoreSongs, hasMoreSongs, setSongs, refreshSongsList]);

    const floatingButtonProps = useMemo(() => ({
        songs,
        setSongs,
        refreshSongsList
    }), [songs, setSongs, refreshSongsList]);

    return (
        <View style={{ flex: 1, backgroundColor: globalStyles.black1 }}>
            <FloatingButton {...floatingButtonProps} />
            <View style={{ marginHorizontal: 10, marginTop: 16 }}>
                <SearchBar {...searchBarProps} />
            </View>
            <SongList {...songListProps} />
        </View>
    );
}