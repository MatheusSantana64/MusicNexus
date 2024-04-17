// The SongForm component is a reusable form component that allows users to add or edit song information.
// It includes input fields for the song title, artist, album, and release date.

import React from 'react';
import { View, TextInput, Button, StyleSheet, Dimensions, TouchableOpacity, } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

const SongForm = ({ song, onSubmit, isEditMode = false, onCancel }) => {
    const [title, setTitle] = React.useState(isEditMode ? song.title : '');
    const [artist, setArtist] = React.useState(isEditMode ? song.artist : '');
    const [album, setAlbum] = React.useState(isEditMode ? song.album : '');
    const [release, setRelease] = React.useState(isEditMode ? song.release : new Date().toISOString().split('T')[0]);
    const [datePickerVisible, setDatePickerVisible] = React.useState(false);

    const handleSubmit = () => {
        onSubmit({ title, artist, album, release });
    };

    return (
        <View style={styles.container}>
            <TextInput
                placeholder="Title"
                value={title}
                onChangeText={setTitle}
                style={styles.input}
                placeholderTextColor="grey"
            />
            
            <TextInput
                placeholder="Artist"
                value={artist}
                onChangeText={setArtist}
                style={styles.input}
                placeholderTextColor="grey"
            />

            <TextInput
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

            <Button title={isEditMode ? "Save Changes" : "Add Song"} onPress={handleSubmit} />

            <View style={styles.cancelButtonContainer}>
                <Button title="Cancel" onPress={onCancel} color="red" />
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

    // Style for the Cancel button container
    cancelButtonContainer: {
        marginTop: 10, // Adjust the marginTop to add some space between the Submit button and the Cancel button
    },
});

export default SongForm;