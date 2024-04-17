import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import * as FileSystem from 'expo-file-system';
import Card from '../components/Card';

const DATA_FILE = 'musicnexus_data.json';
const SAVE_PATH = FileSystem.documentDirectory;
const fileUri = SAVE_PATH + DATA_FILE;

export function Home() {
    const [songs, setSongs] = useState([]);
    const [unratedSongs, setUnratedSongs] = useState([]);
    const [favoriteSongs, setFavoriteSongs] = useState([]);

    useEffect(() => {
        const fetchSongs = async () => {
            const fileInfo = await FileSystem.getInfoAsync(fileUri);
            if (!fileInfo.exists) {
                await FileSystem.writeAsStringAsync(fileUri, JSON.stringify([]));
            }

            const result = await FileSystem.readAsStringAsync(fileUri);
            if (result) {
                const parsedSongs = JSON.parse(result);
                setSongs(parsedSongs);
                setUnratedSongs(parsedSongs.filter(song => song.rating === 0));
                setFavoriteSongs(parsedSongs.filter(song => song.rating >= 8));
            }
        };

        fetchSongs();
    }, []);

    return (
        <View style={styles.container}>
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Unrated Songs</Text>
                <FlatList
                    data={unratedSongs}
                    renderItem={({ item }) => <Card song={item} />}
                    keyExtractor={item => item.id.toString()}
                />
            </View>
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Favorite Songs</Text>
                <FlatList
                    data={favoriteSongs}
                    renderItem={({ item }) => <Card song={item} />}
                    keyExtractor={item => item.id.toString()}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#090909',
        padding: 16,
    },
    section: {
        marginBottom: 20,
    },
    sectionTitle: {
        color: 'white',
        fontSize: 18,
        marginBottom: 10,
    },
});