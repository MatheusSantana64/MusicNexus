import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View } from 'react-native';
import SearchBar from '../components/SearchBar';
import SongList from '../components/SongList';
import FloatingButton from '../components/FloatingButton';
import { fetchSongs } from '../database/databaseOperations';
import { globalStyles } from '../styles/global';
import { useFocusEffect } from '@react-navigation/native';

const OFFSET_SIZE = 100;

export function Music() {
    const [searchText, setSearchText] = useState('');
    const [orderBy, setOrderBy] = useState('release');
    const [orderDirection, setOrderDirection] = useState('desc');
    const [ratingRange, setRatingRange] = useState({ min: 0, max: 10 });
    const [songs, setSongs] = useState([]);
    const [offset, setOffset] = useState(0);
    const [hasMoreSongs, setHasMoreSongs] = useState(true);

    const scrollOffset = useRef(0);
    const listRef = useRef(null);

    const fetchSongsWrapper = useCallback(
        async (
            searchText,
            orderBy,
            orderDirection,
            offset = 0,
            isScroll = false,
            ratingRange = { min: 0, max: 10 },
            preserveOffset = false
        ) => {
            if (!isScroll && !preserveOffset) {
                setSongs([]);
                setOffset(0);
            }
            const fetchedSongs = await fetchSongs(
                searchText,
                orderBy,
                orderDirection,
                offset,
                isScroll,
                ratingRange
            );
            setSongs(prevSongs => (isScroll ? [...prevSongs, ...fetchedSongs] : fetchedSongs));
            setHasMoreSongs(fetchedSongs.length >= OFFSET_SIZE);
        },
        []
    );

    const fetchMoreSongs = useCallback(() => {
        const newOffset = offset + OFFSET_SIZE;
        fetchSongsWrapper(
            searchText,
            orderBy,
            orderDirection,
            newOffset,
            true,
            ratingRange
        );
        setOffset(newOffset);
    }, [offset, searchText, orderBy, orderDirection, ratingRange, fetchSongsWrapper]);

    const refreshSongsList = useCallback(() => {
        fetchSongsWrapper(
            searchText,
            orderBy,
            orderDirection,
            0,
            false,
            ratingRange
        );
    }, [searchText, orderBy, orderDirection, ratingRange, fetchSongsWrapper]);

    // Save scroll position
    const handleScroll = useCallback(event => {
        scrollOffset.current = event.nativeEvent.contentOffset.y;
    }, []);

    // Restore scroll position after songs are loaded
    useEffect(() => {
        if (listRef.current) {
            listRef.current.scrollToOffset({ offset: scrollOffset.current, animated: false });
        }
    }, [songs]);

    // Refresh songs when the screen gains focus
    useFocusEffect(
        useCallback(() => {
            fetchSongsWrapper(
                searchText,
                orderBy,
                orderDirection,
                offset,
                false,
                ratingRange,
                true
            );
        }, [searchText, orderBy, orderDirection, ratingRange, offset, fetchSongsWrapper])
    );

    return (
        <View style={{ flex: 1, backgroundColor: globalStyles.black1 }}>
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
                ref={listRef}
                songs={songs}
                fetchMoreSongs={fetchMoreSongs}
                hasMoreSongs={hasMoreSongs}
                setSongs={setSongs}
                refreshSongsList={refreshSongsList}
                onScroll={handleScroll}
            />

            <FloatingButton
                songs={songs}
                setSongs={setSongs}
                refreshSongsList={refreshSongsList}
            />
        </View>
    );
}