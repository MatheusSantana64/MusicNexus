import React, { useRef } from 'react';
import { TouchableWithoutFeedback, StyleSheet, View, TextInput, Button, Dimensions, TouchableOpacity } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Modal from 'react-native-modal';
import { db } from '../database/databaseSetup';

const SongFormModal = ({ isFormModalVisible, closeModal, selectedSong, songs, setSongs }) => {
    const [title, setTitle] = React.useState(selectedSong ? selectedSong.title : '');
    const [artist, setArtist] = React.useState(selectedSong ? selectedSong.artist : '');
    const [album, setAlbum] = React.useState(selectedSong ? selectedSong.album : '');
    const [release, setRelease] = React.useState(selectedSong ? selectedSong.release : new Date().toISOString().split('T')[0]);
    const [datePickerVisible, setDatePickerVisible] = React.useState(false);
    
    const [editMode, setEditMode] = React.useState(!!selectedSong);

    const titleRef = useRef(null);
    const artistRef = useRef(null);
    const albumRef = useRef(null);

    // Function to insert a new song into the database (Add New Song)
    const handleFormSubmit = async () => {
        if(editMode) {
            const songWithIdAndRating = {
                title: title || "Unknown Title",
                artist: artist || "Unknown Artist",
                album: album || "Unknown Album",
                release: release || "1900-01-01",
                id: selectedSong.id, 
                rating: selectedSong.rating 
            };

            db.transaction(tx => {
                tx.executeSql(
                    'UPDATE songs SET title = ?, artist = ?, album = ?, release = ?, rating = ?, cover_path = ? WHERE id = ?',
                    [songWithIdAndRating.title, songWithIdAndRating.artist, songWithIdAndRating.album, songWithIdAndRating.release, songWithIdAndRating.rating, '', songWithIdAndRating.id],
                    () => {
                        console.log('Song updated successfully');
                        const updatedSongs = songs.map(song => (song.id === songWithIdAndRating.id ? songWithIdAndRating : song));
                        setSongs(updatedSongs);
                    },
                    (_, error) => console.log('Error updating song:', error)
                );
            });
        }
        else {
            const newSong = {
                title: title || "Unknown Title",
                artist: artist || "Unknown Artist",
                album: album || "Unknown Album",
                release: release || "1900-01-01",
                rating: 0, 
                cover_path: '' 
            };

            db.transaction(tx => {
                tx.executeSql(
                    'INSERT INTO songs (title, artist, album, release, rating, cover_path) VALUES (?, ?, ?, ?, ?, ?)',
                    [newSong.title, newSong.artist, newSong.album, newSong.release, newSong.rating, newSong.cover_path],
                    async () => {
                        console.log('Song added successfully');
                    },
                    (_, error) => console.log('Error adding song:', error)
                );
            });

            setTitle('');
            setArtist('');
            setAlbum('');
            setRelease(new Date().toISOString().split('T')[0]);
        }
    };

    // Function to handle the form submission
    const handleSubmit = () => {
        // Check for empty or undefined values and set them to "Unknown"
        const songData = {
            title: title || "Unknown Title",
            artist: artist || "Unknown Artist",
            album: album || "Unknown Album",
            release: release || "1900-01-01",
        };
        handleFormSubmit(songData);

        closeModal();
    };

    // Function to add another song
    const handleAddAnotherSong = () => {
        console.log('Adding another song from the same album');

        // Check for empty or undefined values and set them to "Unknown"
        const songData = {
            title: title || "Unknown Title",
            artist: artist || "Unknown Artist",
            album: album || "Unknown Album",
            release: release || "1900-01-01",
        };
        handleFormSubmit(songData);

        setEditMode(false);
        setTitle('');
        setAlbum(songData.album);
        setArtist(songData.artist);
        setRelease(songData.release);
        titleRef.current.focus();
    };

    return (
        <View style={{ backgroundColor: '#090909', position: 'absolute', right: 0, bottom: 0 }}>
            <Modal
                isVisible={isFormModalVisible}
                onBackdropPress={closeModal}
                onBackButtonPress={closeModal}
                useNativeDriverForBackdrop={true}
                hideModalContentWhileAnimating={true}
                animationInTiming={100}
                animationOutTiming={100}
            >
                <TouchableWithoutFeedback onPress={closeModal}>
                    <View style={styles.modalContainer}>
                        <TouchableWithoutFeedback onPress={() => {}}>
                            <View>
                                <View style={styles.formContainer}>
                                    <TextInput
                                        ref={titleRef}
                                        placeholder="Title"
                                        value={title}
                                        onChangeText={setTitle}
                                        onSubmitEditing={() => artistRef.current?.focus()}
                                        style={styles.input}
                                        placeholderTextColor="grey"
                                    />
                                    
                                    <TextInput
                                        ref={artistRef}
                                        placeholder="Artist"
                                        value={artist}
                                        onChangeText={setArtist}
                                        onSubmitEditing={() => albumRef.current?.focus()}
                                        style={styles.input}
                                        placeholderTextColor="grey"
                                    />

                                    <TextInput
                                        ref={albumRef}
                                        placeholder="Album"
                                        value={album}
                                        onChangeText={setAlbum}
                                        style={styles.input}
                                        placeholderTextColor="grey"
                                    />

                                    <TouchableOpacity onPress={() => setDatePickerVisible(true)}>
                                        <TextInput
                                            placeholder="Release Date"
                                            value={release}
                                            editable={false}
                                            style={styles.input}
                                            placeholderTextColor="grey"
                                        />
                                    </TouchableOpacity>

                                    {datePickerVisible && (
                                        <DateTimePicker
                                            value={new Date(release.split('-')[0], release.split('-')[1] - 1, release.split('-')[2])}
                                            mode="date"
                                            display="default"
                                            onChange={(event, selectedDate) => {
                                                // Toggle the visibility of the date picker first
                                                setDatePickerVisible(!datePickerVisible);
                                                // Then update the release state with the selected date
                                                const currentDate = selectedDate || new Date();
                                                setRelease(currentDate.toISOString().split('T')[0]);
                                            }}
                                        />
                                    )}

                                    <View style={{borderRadius: 5, overflow: 'hidden',}}>
                                        <Button title={editMode ? "Save Changes" : "Add Song"} onPress={handleSubmit} color={'blue'} />
                                    </View>
                                    <View style={{marginTop: 10, borderRadius: 5, overflow: 'hidden',}}>
                                        <Button title={editMode ? "Save Changes and Add Another Song From This Album" : "Add Another Song From This Album"} onPress={handleAddAnotherSong} color={'green'} />
                                    </View>
                                    <View style={{marginTop: 10, borderRadius: 5, overflow: 'hidden',}}>
                                        <Button title="Cancel" onPress={closeModal} color="red"/>
                                    </View>
                                </View>
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    formContainer: {
        backgroundColor: '#1e272e',                     // Set the background color of the form container
        borderRadius: 8,                                // Add some border radius to the form container
        padding: 16,                                    // Add some padding to the form container
        width: Dimensions.get('window').width * 0.8,    // 80% of screen width
    },

    // Style for the input fields
    input: {
        backgroundColor: '#2c3e50',     // Set the background color of the input fields
        borderRadius: 8,                // Add some border radius to the input fields
        color: 'white',                 // Set the text color of the input fields
        height: 48,                     // Set the height of the input fields
        paddingHorizontal: 16,          // Add some padding to the input fields
        marginBottom: 16,               // Add some space between the input fields
        borderWidth: 1,                 // Add a border to the input fields
        borderColor: '#34495e',         // Add a border color to the input fields
        textAlignVertical: 'center',    // Center the text vertically inside the TextInput
    },
});

export default SongFormModal;