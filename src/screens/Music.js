// Music.js
import React, { useState, useEffect } from 'react';
import { View, TextInput, FlatList, Text, TouchableOpacity, Modal, Button, TouchableWithoutFeedback, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import SongForm from '../components/SongForm'; // Import the new merged form
import Card from '../components/Card';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

export function Music() {
    const [searchText, setSearchText] = useState('');
    const [showUnrated, setShowUnrated] = useState(false);
    const [isModalVisible, setModalVisible] = useState(false);
    const [songs, setSongs] = useState([]);
    const [selectedSong, setSelectedSong] = useState(null);
    const [isSongOptionsVisible, setSongOptionsVisible] = useState(false);

    useEffect(() => {
        const fetchSongs = async () => {
            if (Platform.OS === 'web') {
                const savedSongs = localStorage.getItem('songs');
                if (savedSongs) {
                    setSongs(JSON.parse(savedSongs));
                }
            } else {
                try {
                    const fileUri = FileSystem.documentDirectory + 'songs.json';
                    const fileInfo = await FileSystem.getInfoAsync(fileUri);
                    if (!fileInfo.exists) {
                        await FileSystem.writeAsStringAsync(fileUri, JSON.stringify([]));
                    }
                    const result = await FileSystem.readAsStringAsync(fileUri);
                    if (result) {
                        setSongs(JSON.parse(result));
                    }
                } catch (error) {
                    console.error(error);
                }
            }
        };

        fetchSongs();
    }, []);

    const filteredSongs = songs.filter(song => {
        const searchMatch = song.title.toLowerCase().includes(searchText.toLowerCase()) ||
            song.album.toLowerCase().includes(searchText.toLowerCase()) ||
            song.artist.toLowerCase().includes(searchText.toLowerCase());
        return searchMatch && (!showUnrated || !song.rated);
    });

    const handleFabPress = () => {
        setModalVisible(true);
        setSelectedSong(null); // Ensure selectedSong is reset when adding a new song
    };

    const handleFormSubmit = async (song) => {
        const newSongs = [...songs, song];
        setSongs(newSongs);
        if (Platform.OS === 'web') {
            localStorage.setItem('songs', JSON.stringify(newSongs));
        } else {
            try {
                const fileUri = FileSystem.documentDirectory + 'songs.json';
                await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(newSongs));
            } catch (error) {
                console.error(error);
            }
        }
        setModalVisible(false);
    };

    const handleModalBackgroundPress = () => {
        setModalVisible(false);
        setSelectedSong(null); // Reset the selected song
        setSongOptionsVisible(false); // Also reset the song options visibility
    };

    const handleCardPress = (song) => {
        setSelectedSong(song);
        setSongOptionsVisible(true);
    };

    const handleEditSong = () => {
        setModalVisible(true);
    };

    const handleEditFormSubmit = (updatedSong) => {
        const updatedSongs = songs.map(song => song.title === selectedSong.title ? updatedSong : song);
        setSongs(updatedSongs);

        if (Platform.OS === 'web') {
            localStorage.setItem('songs', JSON.stringify(updatedSongs));
        } else {
            try {
                const fileUri = FileSystem.documentDirectory + 'songs.json';
                FileSystem.writeAsStringAsync(fileUri, JSON.stringify(updatedSongs));
            } catch (error) {
                console.error(error);
            }
        }

        setModalVisible(false);
        setSongOptionsVisible(false); // Close the Song Options popup
        setSelectedSong(null); // Clear the selected song
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
                    onPress: () => {
                        const updatedSongs = songs.filter(song => song.title !== selectedSong.title);
                        setSongs(updatedSongs);
    
                        if (Platform.OS === 'web') {
                            localStorage.setItem('songs', JSON.stringify(updatedSongs));
                        } else {
                            try {
                                const fileUri = FileSystem.documentDirectory + 'songs.json';
                                FileSystem.writeAsStringAsync(fileUri, JSON.stringify(updatedSongs));
                            } catch (error) {
                                console.error(error);
                            }
                        }
    
                        setSongOptionsVisible(false);
                        setSelectedSong(null); // Clear the selected song
                    }
                }
            ],
            { cancelable: false }
        );
    };

    return (
        <View style={{ flex: 1, alignItems: 'center', backgroundColor: '#090909', padding: 16 }}>
            <TextInput
                placeholder="Search"
                placeholderTextColor='white'
                style={{
                    backgroundColor: '#1e272e',
                    borderRadius: 8,
                    color: 'white',
                    height: 48,
                    paddingHorizontal: 16,
                    marginTop: 32,
                    marginBottom: 16,
                    width: '80%',
                }}
                onChangeText={text => setSearchText(text)}
            />
            <TouchableOpacity onPress={() => setShowUnrated(!showUnrated)}>
                <Text style={{ color: showUnrated ? 'white' : 'gray', marginBottom: 16 }}>Unrated</Text>
            </TouchableOpacity>
            <FlatList
                data={filteredSongs}
                keyExtractor={(item) => item.title}
                renderItem={({ item }) => <Card song={item} onCardPress={() => handleCardPress(item)} />}
                style={{ width: '100%' }}
            />
            <View style={{ position: 'absolute', bottom: 20, right: 30 }}>
                <TouchableOpacity onPress={handleFabPress} style={{ backgroundColor: 'green', borderRadius: 50, padding: 10 }}>
                    <Icon name="plus" size={30} color="white" />
                </TouchableOpacity>
            </View>
            <Modal
                animationType="slide"
                transparent={true}
                visible={isModalVisible}
                onRequestClose={() => {
                    setModalVisible(!isModalVisible);
                }}
            >
                <TouchableWithoutFeedback onPress={handleModalBackgroundPress}>
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                        <TouchableWithoutFeedback onPress={() => {}}>
                            <View>
                                <SongForm
                                    song={selectedSong}
                                    onSubmit={selectedSong ? handleEditFormSubmit : handleFormSubmit}
                                    isEditMode={!!selectedSong}
                                />
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
            <Modal
                animationType="slide"
                transparent={true}
                visible={isSongOptionsVisible}
                onRequestClose={() => {
                    setSongOptionsVisible(false);
                }}
            >
                <TouchableWithoutFeedback onPress={() => setSongOptionsVisible(false)}>
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                        <TouchableWithoutFeedback onPress={() => {}}>
                            <View style={{ backgroundColor: '#1e272e', borderRadius: 8, padding: 16, width: '80%' }}>
                                <Text style={{ color: 'white', fontSize: 16, marginBottom: 16 }}>Song Options</Text>
                                <TouchableOpacity onPress={handleEditSong} style={{ backgroundColor: 'blue', borderRadius: 8, padding: 10, marginBottom: 16 }}>
                                    <Text style={{ color: 'white', textAlign: 'center' }}>Edit Song</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={handleDeleteSong} style={{ backgroundColor: 'red', borderRadius: 8, padding: 10 }}>
                                    <Text style={{ color: 'white', textAlign: 'center' }}>Delete Song</Text>
                                </TouchableOpacity>
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        </View>
    );
}