// The SearchBar component is a reusable component that renders a search bar with a text input field and a toggle button.
// It allows users to search for songs by title, artist, or album, and toggle the display of unrated songs.

import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';

const SearchBar = ({ searchText, setSearchText, showUnrated, setShowUnrated, setOrderBy, setOrderDirection }) => {
    const [order, setOrder] = useState('title'); // Default order is by title
    const [orderDirection, setOrderDirectionState] = useState('asc'); // Default to ascending

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
        setOrderDirection(newDirection); // Update the order direction in the parent component
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
                    onChangeText={setSearchText}
                />
            </View>
            
            <View style={styles.buttonsContainer}>
                <TouchableOpacity onPress={() => setShowUnrated(!showUnrated)} style={styles.toggleButton}>
                    <Text style={[styles.toggleText, showUnrated ? {color: 'red'} : {}]}>Not Rated</Text>
                </TouchableOpacity>
    
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
        width: '100%',
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
});

export default SearchBar;