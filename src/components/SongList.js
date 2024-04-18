// The SongList component is a reusable component that renders a list of songs.
// It uses the FlatList component to render a list of songs as Card components.

import React from 'react';
import { FlatList } from 'react-native';
import Card from './Card';

const SongList = ({ sortedSongs, handleCardPress, handleEditPress, handleLongPress }) => {
    // Function to extract a unique key for each item in the list
    const keyExtractor = (item, index) => {
        // Use the item's ID as the key, or a fallback key if the ID is missing
        return item.id ? item.id.toString() : `fallback-key-${index}`;
    };

    // Render the list of songs
    return (
        <FlatList
            data={sortedSongs}
            keyExtractor={keyExtractor}
            renderItem={({ item }) =>
                <Card song={item}
                    onCardPress={() => handleCardPress(item)}
                    onEditPress={() => handleEditPress(item)}
                    onLongPress={() => handleLongPress(item)}
                />}
            style={{ width: '100%' }}
        />
    );
};

export default SongList;