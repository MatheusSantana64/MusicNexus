// The SearchBar component is a reusable component that renders a search bar with a text input field and a toggle button.
// It allows users to search for songs by title, artist, or album, and toggle the display of unrated songs.

import React from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet } from 'react-native';

const SearchBar = ({ searchText, setSearchText, showUnrated, setShowUnrated }) => {
    // Function to toggle the display of unrated songs
    const toggleShowUnrated = () => setShowUnrated(!showUnrated);

    // Render the search bar with a text input field and a toggle button
    return (
        <View style={styles.container}>
            <View style={styles.inputContainer}>
                <TextInput
                    placeholder="Search"
                    placeholderTextColor='white'
                    style={styles.input}
                    onChangeText={setSearchText}
                />
            </View>
            
            <TouchableOpacity onPress={toggleShowUnrated} style={styles.toggleButton}>
                <Text style={[styles.toggleText, showUnrated ? {color: 'red'} : {}]}>Not Rated</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'column',
        alignItems: 'center',
        marginBottom: 16,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '80%',
    },
    input: {
        backgroundColor: '#1e272e',
        borderRadius: 8,
        color: 'white',
        height: 32,
        paddingHorizontal: 16,
        width: '100%',
        fontSize: 12,
    },
    toggleButton: {
        marginTop: 16,
    },
    toggleText: {
        color: 'gray',
        marginLeft: 16,
    },
});

export default SearchBar;