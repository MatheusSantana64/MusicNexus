import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { globalStyles } from '../styles/global';

const SearchBarAdv = ({ searchParams, setSearchParams, handleSearch }) => {
    return (
        <View style={styles.searchBarContainer}>
            {['Title', 'Artist', 'Album'].map((placeholder, index) => (
                <View key={index} style={styles.inputContainer}>
                    <TextInput
                        placeholder={placeholder}
                        placeholderTextColor='grey'
                        style={styles.input}
                        value={searchParams[placeholder.toLowerCase()]}
                        onChangeText={(text) => setSearchParams(prev => ({ ...prev, [placeholder.toLowerCase()]: text }))}
                    />
                    {searchParams[placeholder.toLowerCase()] ? (
                        <TouchableOpacity onPress={() => setSearchParams(prev => ({ ...prev, [placeholder.toLowerCase()]: '' }))} style={styles.clearButton}>
                            <Icon name="x" size={24} color="white" />
                        </TouchableOpacity>
                    ) : null}
                </View>
            ))}
            <View style={styles.rowContainer}>
                <View style={styles.inputContainerHalf}>
                    <TextInput
                        placeholder='Year'
                        placeholderTextColor='grey'
                        style={styles.input}
                        value={searchParams['year']}
                        onChangeText={(text) => setSearchParams(prev => ({ ...prev, year: text }))}
                    />
                    {searchParams['year'] ? (
                        <TouchableOpacity onPress={() => setSearchParams(prev => ({ ...prev, year: '' }))} style={styles.clearButton}>
                            <Icon name="x" size={24} color="white" />
                        </TouchableOpacity>
                    ) : null}
                </View>
                <TouchableOpacity onPress={handleSearch} style={styles.searchButtonHalf}>
                    <Text style={styles.buttonText}>Search <Icon name="search" size={20} color="white" /></Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    searchBarContainer: {
        marginVertical: 10,
        backgroundColor: globalStyles.gray1,
        borderRadius: 8,
        padding: 5,
        paddingHorizontal: 10,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 3,
    },
    input: {
        color: 'white',
        fontSize: 18,
        height: 40,
        flex: 1,
        paddingHorizontal: 10,
        backgroundColor: globalStyles.gray2,
        borderRadius: 8,
        paddingRight: 40,
    },
    clearButton: {
        position: 'absolute',
        right: 10,
    },
    rowContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 3,
    },
    inputContainerHalf: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 5,
    },
    searchButtonHalf: {
        flex: 1,
        padding: 10,
        backgroundColor: globalStyles.blue2,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default SearchBarAdv;