// The SearchBar component is a reusable component that renders a search bar with a text input field and a toggle button.
// It allows users to search for songs by title, artist, or album, and toggle the display of unrated songs.

import React, { useState, useCallback } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, Keyboard } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import Modal from 'react-native-modal';
import OrderButtons from './OrderButtons';

const SearchBar = ({ setSearchText, setOrderBy, setOrderDirection, ratingRange, setRatingRange, showFilters = false }) => {
    const [inputText, setInputText] = useState('');
    const [order, setOrder] = useState('title');
    const [orderDirection, setOrderDirectionState] = useState('asc');
    const [modalVisible, setModalVisible] = useState(false);

    // Add state for the slider values
    const [low, setLow] = useState(0);
    const [high, setHigh] = useState(10);

    const toggleModal = () => {
        setModalVisible(!modalVisible);
    };

    // Function to handle the Enter key press
    const handleEnterPress = () => {
        setSearchText(inputText.trim());
        Keyboard.dismiss();
    };

    // Function to clear the search input
    const clearSearchInput = () => {
        setInputText('');
        setSearchText('');
    };    

    return (
        <View style={styles.container}>
            <View style={styles.inputContainer}>
                <TextInput
                    placeholder="Search"
                    placeholderTextColor='white'
                    style={styles.input}
                    value={inputText} // Bind the TextInput value to the inputText state
                    onChangeText={setInputText} // Update the input text state
                    onSubmitEditing={handleEnterPress} // Trigger the search on Enter key press
                />
                <TouchableOpacity onPress={handleEnterPress} style={styles.searchButton}>
                    <Icon name="search" size={24} color="white" />
                </TouchableOpacity>
                {inputText && (
                    <TouchableOpacity onPress={clearSearchInput} style={styles.clearButton}>
                        <Icon name="x" size={30} color="white" />
                    </TouchableOpacity>
                )}
            </View>
            
            {showFilters && (
                <View style={styles.buttonsContainer}>
                    <TouchableOpacity onPress={toggleModal}>
                        <Text style={{ color: 'white', marginRight: 8 }}>Rating: {ratingRange.min} ~ {ratingRange.max}</Text>
                    </TouchableOpacity>
                    
                    <Modal
                        isVisible={modalVisible}
                        onBackdropPress={toggleModal}
                        onBackButtonPress={toggleModal}
                        style={styles.modalContainer}
                        useNativeDriverForBackdrop={true}
                        hideModalContentWhileAnimating={true}
                        animationInTiming={100}
                        animationOutTiming={100}
                    >
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>Rating:</Text>
                            <View style={styles.ratingContainer}>
                                <View style={styles.ratingButtons}>
                                    <TouchableOpacity onPress={() => setLow(Math.max(0, Math.min(high, low + 0.5)))} style={styles.ratingButton}>
                                        <Icon name="plus-circle" size={40} color="limegreen" />
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => setLow(Math.max(0, Math.min(high, low - 0.5)))} style={styles.ratingButton}>
                                        <Icon name="minus-circle" size={40} color="crimson" />
                                    </TouchableOpacity>
                                </View>

                                <Text style={styles.modalSubtitle}>
                                    {high === 10 ? `${low.toFixed(1)} ~ ${high}` : `${low.toFixed(1)} ~ ${high.toFixed(1)}`}
                                </Text>

                                <View style={styles.ratingButtons}>
                                    <TouchableOpacity onPress={() => setHigh(Math.max(low, Math.min(10, high + 0.5)))} style={styles.ratingButton}>
                                        <Icon name="plus-circle" size={40} color="limegreen" />
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => setHigh(Math.max(low, Math.min(10, high - 0.5)))} style={styles.ratingButton}>
                                        <Icon name="minus-circle" size={40} color="crimson" />
                                    </TouchableOpacity>
                                </View>                                
                            </View>

                            <View style={styles.buttonsRow}>
                                <TouchableOpacity onPress={() => { setLow(0); setHigh(0); }} style={{ ...styles.button, backgroundColor: 'darkred' }}>
                                    <Text style={styles.buttonText}>Not Rated</Text>
                                    <Text style={{ ...styles.buttonText, fontSize: 12 }}>(0 ~ 0)</Text>
                                </TouchableOpacity>

                                <TouchableOpacity onPress={() => { setLow(8); setHigh(10); }} style={{ ...styles.button, backgroundColor: 'darkgoldenrod' }}>
                                    <Text style={styles.buttonText}>Favorites</Text>
                                    <Text style={{ ...styles.buttonText, fontSize: 12 }}>(8 ~ 10)</Text>
                                </TouchableOpacity>

                                <TouchableOpacity onPress={() => { setLow(0); setHigh(10); }} style={{ ...styles.button, backgroundColor: 'darkgreen' }}>
                                    <Text style={styles.buttonText}>All Ratings</Text>
                                    <Text style={{ ...styles.buttonText, fontSize: 12 }}>(0 ~ 10)</Text>
                                </TouchableOpacity>
                            </View>

                            <TouchableOpacity onPress={() => { toggleModal(); setRatingRange({ min: low, max: high }); }} style={{ ...styles.button, marginTop: 10, backgroundColor: 'rebeccapurple', width: '100%' }}>
                                <Text style={styles.buttonText}>Apply</Text>
                            </TouchableOpacity>
                        </View>
                    </Modal>
                    
                    <OrderButtons
                        order={order}
                        setOrder={setOrder}
                        orderDirection={orderDirection}
                        setOrderDirection={setOrderDirectionState}
                        setMusicOrder={setOrderBy}
                        setMusicOrderDirection={setOrderDirection}
                    />
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'column',
        marginBottom: 16,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '90%',
    },
    input: {
        backgroundColor: '#1e272e',
        borderRadius: 8,
        color: 'white',
        height: 32,
        paddingHorizontal: 16,
        paddingRight: 40,
        width: '100%',
        fontSize: 18,
        height: 50,
    },
    buttonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '95%',
        marginTop: 16,
    },
    clearButton: {
        position: 'absolute',
        right: 10,
    },
    searchButton: {
        marginLeft: 10,
    },

    modalContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#1e272e',
        padding: 20,
        borderRadius: 8,
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    
    modalTitle: {
        color: 'white',
        fontSize: 28,
    },
    modalSubtitle: {
        color: 'white',
        fontSize: 40,
        marginBottom: 16,
    },

    ratingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        marginBottom: 16,
    },
    ratingButtons: {
        flexDirection: 'column',
    },
    ratingButton: {
        paddingBottom: 10,
    },

    
    buttonsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
    },
    button: {
        borderRadius: 8,
        padding: 8,
    },
    buttonText: {
        color: 'white',
        fontSize: 18,
        textAlign: 'center',
    },
});

export default SearchBar;