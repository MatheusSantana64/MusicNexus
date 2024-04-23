// The SongForm component is a reusable form component that allows users to add or edit song information.
// It includes input fields for the song title, artist, album, and release date.

import React, { useRef } from 'react';
import { View, TextInput, Button, StyleSheet, Dimensions, TouchableOpacity, } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

const SongForm = ({ song, onSubmit, isEditMode = false, onCancel }) => {
    const [title, setTitle] = React.useState(isEditMode && song.title !== "Unknown Title" ? song.title : '');
    const [artist, setArtist] = React.useState(isEditMode && song.artist !== "Unknown Artist" ? song.artist : '');
    const [album, setAlbum] = React.useState(isEditMode && song.album !== "Unknown Album" ? song.album : '');
    const [release, setRelease] = React.useState(isEditMode && song.release !== "1900-01-01" ? song.release : new Date().toISOString().split('T')[0]);
    const [datePickerVisible, setDatePickerVisible] = React.useState(false);

    // Create refs for each input field
    const titleRef = useRef(null);
    const artistRef = useRef(null);
    const albumRef = useRef(null);
    
    const handleSubmit = () => {
        // Check for empty or undefined values and set them to "Unknown"
        const songData = {
            title: title || "Unknown Title",
            artist: artist || "Unknown Artist",
            album: album || "Unknown Album",
            release: release || "1900-01-01",
        };
        onSubmit(songData);

        if (onCancel) { // Close the modal after Adding the song
            onCancel();
        }
    };

    const handleAddAnotherSong = () => {
        // Check for empty or undefined values and set them to "Unknown"
        const songData = {
            title: title || "Unknown Title",
            artist: artist || "Unknown Artist",
            album: album || "Unknown Album",
            release: release || "1900-01-01",
        };
        onSubmit(songData);
    
        // Clear the title field but keep the album, artist, and release fields filled
        setTitle('');

        titleRef.current.focus();
    };

    return (
        <View style={styles.container}>
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
                <Button title={isEditMode ? "Save Changes" : "Add Song"} onPress={handleSubmit} color={'blue'} />
            </View>
            <View style={{marginTop: 10, borderRadius: 5, overflow: 'hidden',}}>
                <Button title={isEditMode ? "Save Changes and Add Another Song From This Album" : "Add Another Song From This Album"} onPress={handleAddAnotherSong} color={'green'} />
            </View>
            <View style={{marginTop: 10, borderRadius: 5, overflow: 'hidden',}}>
                <Button title="Cancel" onPress={onCancel} color="red"/>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    // Style for the form container
    container: {
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

export default SongForm;