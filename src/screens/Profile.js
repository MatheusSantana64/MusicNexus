import React, { useState, useCallback, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, ScrollView, Pressable, TextInput } from 'react-native';
import SettingsModal from '../components/SettingsModal';
import { useKeepAwake } from 'expo-keep-awake';
import Icon from 'react-native-vector-icons/FontAwesome';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { globalStyles } from '../styles/global';
import { profileScreenStyles as styles } from '../styles/screenStyles';
import { 
    getTotalSongs,
    getTotalArtists,
    getTotalAlbums,
    getSongsCountByRating,
    getSongsCountByYear,
    getTagsWithSongCount
} from '../database/databaseOperations';

const Stats = ({ totalSongs, totalArtists, totalAlbums, songsCountByRating, songsCountByYear, tagsWithSongCount, notes, setNotes }) => (
    <View style={styles.stats}>
        <Text style={styles.title}>Stats</Text>
        <ScrollView contentContainerStyle={{ flexDirection: 'row', justifyContent: 'space-between' }} persistentScrollbar={true}>
            <View style={{ flex: 1 }}>
                <Text style={{ ...styles.statsText, color: 'skyblue' }}>{totalSongs} songs</Text>
                <Text style={{ ...styles.statsSubTitle, color: 'khaki' }}>Ratings:</Text>
                {songsCountByRating.map((item, index) => (
                    <Text style={{ ...styles.statsText, marginBottom: 2, color: 'khaki', fontWeight: 'normal' }} key={index}>{item.rating === 0 ? 'Unrated' : item.rating === 10 ? item.rating.toFixed(0) : item.rating.toFixed(1)}: <Text style={{ fontWeight: 'bold', color: 'white' }}>{item.count}</Text></Text>
                ))}
            </View>
            <View style={{ width: 1, backgroundColor: 'black', marginHorizontal: 10 }} />
            <View style={{ flex: 1 }}>
                <Text style={{ ...styles.statsText, color: 'pink' }}>{totalArtists} artists</Text>
                <Text style={{ ...styles.statsSubTitle, color: 'mediumpurple' }}>Years:</Text>
                {songsCountByYear.map((item, index) => (
                    <Text style={{ ...styles.statsText, marginBottom: 2, color: 'mediumpurple', fontWeight: 'normal' }} key={index}>{item.year}: <Text style={{ fontWeight: 'bold', color: 'white' }}>{item.count}</Text></Text>
                ))}
            </View>
            <View style={{ width: 1, backgroundColor: 'black', marginHorizontal: 10 }} />
            <View style={{ flex: 1 }}>
                <Text style={{ ...styles.statsText, color: 'lightgreen' }}>{totalAlbums} albums</Text>
                <Text style={{ ...styles.statsSubTitle, color: 'lightcoral' }}>Tags:</Text>
                {tagsWithSongCount.map((tag, index) => (
                    <Text style={{ ...styles.statsText, marginBottom: 2, color: 'lightcoral', fontWeight: 'normal' }} key={index}>{tag.name}: <Text style={{ fontWeight: 'bold', color: 'white' }}>{tag.count}</Text></Text>
                ))}
            </View>
        </ScrollView>
    </View>
);

export function Profile() {
    const [state, setState] = useState({
        isSettingsModalVisible: false,
        totalSongs: 0,
        totalArtists: 0,
        totalAlbums: 0,
        songsCountByRating: [],
        songsCountByYear: [],
        tagsWithSongCount: [],
    });
    const [notes, setNotes] = useState('');

    useKeepAwake();

    useFocusEffect(
        useCallback(() => {
            const fetchStats = async () => {
                const totalSon = await getTotalSongs();
                const totalArt = await getTotalArtists();
                const totalAlb = await getTotalAlbums();
                const songsCountByRating = await getSongsCountByRating();
                const songsCountByYear = await getSongsCountByYear();
                const tagsWithSongCount = await getTagsWithSongCount();

                setState(prevState => ({
                    ...prevState,
                    totalSongs: totalSon,
                    totalArtists: totalArt,
                    totalAlbums: totalAlb,
                    songsCountByRating,
                    songsCountByYear,
                    tagsWithSongCount,
                }));
            };

            const fetchNotes = async () => {
                const savedNotes = await AsyncStorage.getItem('userNotes');
                if (savedNotes) {
                    setNotes(savedNotes);
                }
            };

            fetchStats();
            fetchNotes();
        }, [])
    );

    useEffect(() => {
        AsyncStorage.setItem('userNotes', notes);
    }, [notes]);

    return (
        <View style={{ flex: 1 }}>
            <View style={{ 
                position: 'absolute', 
                top: 16, 
                right: 24, 
                zIndex: 1 
            }}>
                <Pressable onPress={() => setState(prevState => ({ ...prevState, isSettingsModalVisible: true }))}>
                    <Icon name="gear" size={32} color="#fff" />
                </Pressable>
            </View>

            <SettingsModal
                isVisible={state.isSettingsModalVisible}
                closeModal={() => setState(prevState => ({ ...prevState, isSettingsModalVisible: false }))} 
            />

            <View style={{ 
                flex: 1,
                alignItems: 'center',
                justifyContent: 'flex-start',
                padding: 10,
                backgroundColor: globalStyles.defaultBackgroundColor,
            }}>
                <Stats
                    totalSongs={state.totalSongs}
                    totalArtists={state.totalArtists}
                    totalAlbums={state.totalAlbums}
                    songsCountByRating={state.songsCountByRating}
                    songsCountByYear={state.songsCountByYear}
                    tagsWithSongCount={state.tagsWithSongCount}
                    notes={notes}
                    setNotes={setNotes}
                />
            </View>
            <View style={styles.notesContainer}>
                <Text style={{...styles.title, marginBottom: 4}}>My Notes:</Text>
                <TextInput
                    style={styles.notesInput}
                    placeholder="Write your notes here..."
                    placeholderTextColor="gray"
                    value={notes}
                    onChangeText={setNotes}
                    multiline
                />
                <Text style={{ color: 'gray', fontSize: 12, marginTop: 4 }}>Notes are saved automatically</Text>
            </View>
        </View>
    );
}