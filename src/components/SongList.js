import React from 'react';
import { FlatList } from 'react-native';
import Card from './Card';

const SongList = ({ filteredSongs, handleCardPress, handleEditPress, handleLongPress }) => {
    // Function to extract a unique key for each item in the list
    const keyExtractor = (item, index) => {
        // Use the item's ID as the key, or a fallback key if the ID is missing
        return item.id ? item.id.toString() : `fallback-key-${index}`;
    };

    // Render the list of songs
    return (
        <FlatList
            data={filteredSongs}        // Pass the list of songs to the FlatList component
            keyExtractor={keyExtractor} // Use the keyExtractor function to generate keys
            renderItem={({ item }) =>   // Render each item in the list as a Card component
                <Card song={item}       // Pass the song data to the Card component
                    onCardPress={() => handleCardPress(item)}   // Handle the press event on the card
                    onEditPress={() => handleEditPress(item)}   // Handle the press event on the edit icon
                    onLongPress={() => handleLongPress(item)}   // Handle the long press event on the card
                />}
            style={{ width: '100%' }}   // Set the width of the list to 100%
        />
    );
};

export default SongList;