import React from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet } from 'react-native';

const SearchBar = ({ searchText, setSearchText, showUnrated, setShowUnrated }) => {
 const toggleShowUnrated = () => setShowUnrated(!showUnrated);

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