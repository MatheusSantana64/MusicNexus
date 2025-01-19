import React from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { searchBarAdvStyles as styles } from '../styles/componentsStyles';

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

export default SearchBarAdv;