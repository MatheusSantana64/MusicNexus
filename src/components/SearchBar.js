// The SearchBar component is a reusable component that renders a search bar with a text input field and a toggle button.
// It allows users to search for songs by title, artist, or album, and toggle the display of unrated songs.

import React, { useState, useCallback } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, Keyboard } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import Modal from 'react-native-modal';
import RangeSlider from 'rn-range-slider'; 
import OrderButtons from './OrderButtons';

const SearchBar = ({ setSearchText, setOrderBy, setOrderDirection, ratingRange, setRatingRange, showFilters = false }) => {
    const [inputText, setInputText] = useState('');
    const [order, setOrder] = useState('title');
    const [orderDirection, setOrderDirectionState] = useState('asc');
    const [modalVisible, setModalVisible] = useState(false);

    // Add state for the slider values
    const [low, setLow] = useState(0);
    const [high, setHigh] = useState(10);

    // Handler for the slider value change
    const handleValueChange = useCallback((low, high) => {
        setLow(low);
        setHigh(high);
        setRatingRange({ min: low, max: high });
    }, []);

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
                    <TouchableOpacity onPress={toggleModal} style={styles.ratingTextContainer}>
                        <Text style={{ color: 'white', marginRight: 8 }}>Rating: {low} - {high}</Text>
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
                            <Text style={styles.modalSubtitle}>{low} ~ {high}</Text>
                            <View style={styles.sliderContainer}>
                                <RangeSlider
                                    style={styles.slider}
                                    min={0}
                                    max={10}
                                    step={0.5}
                                    floatingLabel={false}
                                    renderThumb={() => <View style={{ height: 40, width: 40, backgroundColor: 'lightgray', borderRadius: 20 }} />}
                                    renderRail={() => <View style={{ height: 30, width: '100%', backgroundColor: 'gray', borderRadius: 15 }} />}
                                    renderRailSelected={() => <View style={{ height: 30, width: '100%', backgroundColor: 'darkblue' }} />}
                                    renderLabel={value => <Text style={{ fontSize: 32, color: 'aqua' }}>{value}</Text>}
                                    onSliderTouchEnd={handleValueChange}
                                    low={low}
                                    high={high}
                                />
                            </View>
                            <TouchableOpacity onPress={() => { setLow(0); setHigh(10); setRatingRange({ min: 0, max: 10 }); toggleModal(); }} style={styles.resetButton}>
                                <Text style={styles.closeText}>Show All Songs</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => { setLow(0); setHigh(0); setRatingRange({ min: 0, max: 0 }); toggleModal(); }} style={styles.notRatedButton}>
                                <Text style={styles.closeText}>Show Not Rated</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={toggleModal} style={styles.closeButton}>
                                <Text style={styles.closeText}>Close</Text>
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
    orderButtonsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    toggleButton: {
        marginRight: 16,
    },
    toggleText: {
        color: 'silver',
    },
    orderButton: {
        marginLeft: 16,
    },
    orderDirectionButton: {
        marginLeft: 10,
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
        alignItems: 'center', // Center the content horizontally
        justifyContent: 'center', // Center the content vertically
    },
    modalTitle: {
        color: 'white',
        fontSize: 24,
    },
    modalSubtitle: {
        color: 'white',
        fontSize: 28,
        marginBottom: 32,
    },
    sliderContainer: { // Adjusted container for the slider
        width: '100%', // Ensure the container takes the full width
        height: 50, // Define a specific height for the slider container
        justifyContent: 'center', // Center the slider vertically
        alignItems: 'center', // Center the slider horizontally
        marginBottom: 16,
    },
    slider: {
        width: '100%',
        flex: 1,
    },
    resetButton: {
        marginTop: 60,
        backgroundColor: 'darkgreen',
        borderRadius: 8,
        padding: 10,
        width: '80%',
    },
    notRatedButton: {
        marginTop: 10,
        backgroundColor: 'darkred',
        borderRadius: 8,
        padding: 10,
        width: '80%',
    },
    closeButton: {
        marginTop: 10,
        backgroundColor: 'rebeccapurple',
        borderRadius: 8,
        padding: 10,
        width: '80%',
    },
    closeText: {
        color: 'white',
        fontSize: 16,
        textAlign: 'center',
    },
});

export default SearchBar;