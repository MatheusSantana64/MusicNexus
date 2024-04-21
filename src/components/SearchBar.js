// The SearchBar component is a reusable component that renders a search bar with a text input field and a toggle button.
// It allows users to search for songs by title, artist, or album, and toggle the display of unrated songs.

import React, { useState, useCallback } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, Keyboard } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import RangeSlider from 'rn-range-slider'; 

const SearchBar = ({ setSearchText, setOrderBy, setOrderDirection, ratingRange, setRatingRange }) => {
    const [inputText, setInputText] = useState('');
    const [order, setOrder] = useState('title');
    const [orderDirection, setOrderDirectionState] = useState('asc');

    // Add state for the slider values
    const [low, setLow] = useState(0);
    const [high, setHigh] = useState(10);

    // Handler for the slider value change
    const handleValueChange = useCallback((low, high) => {
        setLow(low);
        setHigh(high);
        setRatingRange({ min: low, max: high }); // Update the parent component's state
    }, []);    

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
    
    // Function to toggle the order and update the button text
    const toggleOrder = () => {
        let newOrder;
        switch (order) {
            case 'title':
                newOrder = 'artist';
                break;
            case 'artist':
                newOrder = 'release';
                break;
            case 'release':
                newOrder = 'rating';
                break;
            default:
                newOrder = 'title';
                break;
        }
        setOrder(newOrder);
        setOrderBy(newOrder);
    };
    
    // Function to determine the color based on the order state
    const getOrderColor = () => {
        switch (order) {
            case 'title':
                return 'aqua';
            case 'artist':
                return 'violet';
            case 'release':
                return 'sandybrown';
            default:
                return 'yellow';
        }
    };

    // Function to toggle the order direction
    const toggleOrderDirection = () => {
        const newDirection = orderDirection === 'asc' ? 'desc' : 'asc';
        setOrderDirectionState(newDirection);
        setOrderDirection(newDirection); 
    };

    // Function to determine the color based on the order direction state
    const getOrderDirectionColor = () => {
        return orderDirection === 'asc' ? 'springgreen' : 'tomato';
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
            
            <View style={styles.buttonsContainer}>
                <Text style={{ color: 'white', marginRight: 8 }}>Rating: {low} - {high}</Text>
                <RangeSlider
                    style={styles.slider}
                    min={0}
                    max={10}
                    step={0.5}
                    floatingLabel
                    renderThumb={() => <View style={{ height: 20, width: 20, backgroundColor: 'lightgray', borderRadius: 10 }} />}
                    renderRail={() => <View style={{ height: 10, width: '100%', backgroundColor: 'gray', borderRadius: 10 }} />}
                    renderRailSelected={() => <View style={{ height: 10, width: '100%', backgroundColor: 'darkblue' }} />}
                    renderLabel={value => <Text style={{ color: 'white' }}>{value}</Text>}
                    onSliderTouchEnd={handleValueChange}
                    low={low}
                    high={high}
                />
                
                <View style={styles.orderButtonsContainer}>
                    <TouchableOpacity onPress={toggleOrder} style={styles.orderButton}>
                        <Text style={[{color: getOrderColor()}]}>Order by {order.charAt(0).toUpperCase() + order.slice(1)}</Text>
                    </TouchableOpacity>
    
                    <TouchableOpacity onPress={toggleOrderDirection} style={styles.orderDirectionButton}>
                        {orderDirection === 'asc' ? (
                            <Icon name="chevron-up" size={18} color={getOrderDirectionColor()} />
                        ) : (
                            <Icon name="chevron-down" size={18} color={getOrderDirectionColor()} />
                        )}
                    </TouchableOpacity>
                </View>
            </View>
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
        right: 40,
    },
    searchButton: {
        marginLeft: 10,
    },
    slider: {
        width: '100%',
        flex: 1,
    },
});

export default SearchBar;