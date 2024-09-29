import React, { useState, useEffect } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';

import { globalStyles } from '../styles/global';

const OnlineSearchBar = ({ handleSearch, searchText = '' }) => {
    const [inputText, setInputText] = useState(searchText);

    useEffect(() => {
        setInputText(searchText);
    }, [searchText]);

    const handleEnterPress = () => {
        handleSearch(inputText.trim());
    };

    return (
        <View style={styles.container}>
            <TextInput
                placeholder="Search Online"
                placeholderTextColor='white'
                style={styles.input}
                value={inputText}
                onChangeText={setInputText}
                onSubmitEditing={handleEnterPress}
            />
            <TouchableOpacity onPress={handleEnterPress} style={styles.searchButton}>
                <Icon name="search" size={24} color="white" />
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    input: {
        backgroundColor: globalStyles.gray1,
        borderRadius: 8,
        color: 'white',
        height: 32,
        paddingHorizontal: 16,
        paddingRight: 40,
        width: '90%',
        fontSize: 18,
        height: 50,
    },
    searchButton: {
        marginLeft: 10,
    },
});

export default OnlineSearchBar;