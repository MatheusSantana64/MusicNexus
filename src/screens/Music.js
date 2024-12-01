import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import SearchBar from '../components/SearchBar';
import SongList from '../components/SongList';
import SongFormModal from '../components/SongFormModal';
import { fetchSongs } from '../database/databaseOperations';
import { globalStyles } from '../styles/global';

const OFFSET_SIZE = 100;

export function Music() {
    const [searchText, setSearchText] = useState('');
    const [orderBy, setOrderBy] = useState('release');
    const [orderDirection, setOrderDirection] = useState('desc');
    const [ratingRange, setRatingRange] = useState({ min: 0, max: 10 });
    const [tagFilter, setTagFilter] = useState([]);
    const [songs, setSongs] = useState([]);
    const [offset, setOffset] = useState(0);
    const [hasMoreSongs, setHasMoreSongs] = useState(true);
    const [isFormModalVisible, setFormModalVisible] = useState(false);
    
    // Ref to track if initial data has been loaded
    const isInitialLoadDone = useRef(false);

    const fetchSongsWrapper = useCallback(async (searchText, orderBy, orderDirection, offset = 0, isScroll = false, ratingRange = { min: 0, max: 10 }, tagFilter = []) => {
        if (!isScroll) {
            setSongs([]);
            setOffset(0);
        }
        const fetchedSongs = await fetchSongs(searchText, orderBy, orderDirection, offset, isScroll, ratingRange, tagFilter);
        setSongs(prevSongs => (isScroll ? [...prevSongs, ...fetchedSongs] : fetchedSongs));
        setHasMoreSongs(fetchedSongs.length >= OFFSET_SIZE);
    }, []);

    const fetchMoreSongs = useCallback(() => {
        const newOffset = offset + OFFSET_SIZE;
        fetchSongsWrapper(searchText, orderBy, orderDirection, newOffset, true, ratingRange, tagFilter);
        setOffset(newOffset);
    }, [offset, searchText, orderBy, orderDirection, ratingRange, tagFilter, fetchSongsWrapper]);

    // Initial data load using useEffect
    useEffect(() => {
        if (!isInitialLoadDone.current) {
            fetchSongsWrapper(searchText, orderBy, orderDirection, 0, false, ratingRange, tagFilter);
            isInitialLoadDone.current = true;
        }
    }, []);

    // Only reload when search params change, not on every focus
    useEffect(() => {
        if (isInitialLoadDone.current) {
            fetchSongsWrapper(searchText, orderBy, orderDirection, 0, false, ratingRange, tagFilter);
        }
    }, [searchText, orderBy, orderDirection, ratingRange, tagFilter]);

    const refreshSongsList = useCallback(() => {
        fetchSongsWrapper(searchText, orderBy, orderDirection, 0, false, ratingRange, tagFilter);
    }, [searchText, orderBy, orderDirection, ratingRange, tagFilter, fetchSongsWrapper]);

    const searchBarProps = useMemo(() => ({
        searchText,
        setSearchText,
        setOrderBy,
        setOrderDirection,
        ratingRange,
        setRatingRange,
        showFilters: true,
        setTagFilter
    }), [searchText, setSearchText, setOrderBy, setOrderDirection, ratingRange, setRatingRange, setTagFilter]);

    const songListProps = useMemo(() => ({
        songs,
        fetchMoreSongs,
        hasMoreSongs,
        setSongs,
        refreshSongsList
    }), [songs, fetchMoreSongs, hasMoreSongs, setSongs, refreshSongsList]);

    const toggleFormModal = () => {
        setFormModalVisible(!isFormModalVisible);
    };

    return (
        <View style={{ flex: 1, backgroundColor: globalStyles.black1 }}>
            <View style={styles.buttonContainer}>
                <TouchableOpacity onPress={refreshSongsList} style={styles.refreshButton}>
                    <Icon name="refresh-cw" size={24} color="white" />
                </TouchableOpacity>
                <TouchableOpacity onPress={toggleFormModal} style={styles.floatingButton}>
                    <Icon name="plus" size={24} color="white" />
                </TouchableOpacity>
            </View>
            <View style={{ marginHorizontal: 10, marginTop: 16 }}>
                <SearchBar {...searchBarProps} />
            </View>
            <SongList {...songListProps} />
            <SongFormModal
                isFormModalVisible={isFormModalVisible}
                closeModal={toggleFormModal}
                selectedSong={null}
                songs={songs}
                setSongs={setSongs}
                refreshSongsList={refreshSongsList}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    buttonContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        position: 'absolute',
        top: 16,
        right: 16,
        zIndex: 1,
    },
    refreshButton: {
        marginRight: 10,
        backgroundColor: globalStyles.blue1,
        paddingHorizontal: 6,
        borderRadius: 5,
        height: 40,
        width: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    floatingButton: {
        backgroundColor: globalStyles.green1,
        paddingHorizontal: 6,
        borderRadius: 5,
        height: 40,
        width: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
});