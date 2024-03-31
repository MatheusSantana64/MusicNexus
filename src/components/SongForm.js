// SongForm.js
import React from 'react';
import { View, TextInput, Button, StyleSheet, Dimensions } from 'react-native';

const SongForm = ({ song, onSubmit, isEditMode = false }) => {
    const [title, setTitle] = React.useState(isEditMode ? song.title : '');
    const [artist, setArtist] = React.useState(isEditMode ? song.artist : '');
    const [album, setAlbum] = React.useState(isEditMode ? song.album : '');
    const [release, setRelease] = React.useState(isEditMode ? song.release : '');

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
                placeholderTextColor="white"
            />
            <TextInput
                placeholder="Artist"
                value={artist}
                onChangeText={setArtist}
                style={styles.input}
                placeholderTextColor="white"
            />
            <TextInput
                placeholder="Album"
                value={album}
                onChangeText={setAlbum}
                style={styles.input}
                placeholderTextColor="white"
            />
            <TextInput
                placeholder="Release Date"
                value={release}
                onChangeText={setRelease}
                style={styles.input}
                placeholderTextColor="white"
            />
            <Button title={isEditMode ? "Save Changes" : "Add Song"} onPress={handleSubmit} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#1e272e',
        borderRadius: 8,
        padding: 16,
        width: Dimensions.get('window').width * 0.8, // 80% of screen width
    },
    input: {
        backgroundColor: '#2c3e50',
        borderRadius: 8,
        color: 'white',
        height: 48,
        paddingHorizontal: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#34495e',
        textAlignVertical: 'center',
    },
});

export default SongForm;