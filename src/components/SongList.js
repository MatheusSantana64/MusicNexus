import React from 'react';
import { FlatList } from 'react-native';
import Card from './Card';

const SongList = ({ filteredSongs, handleCardPress, handleEditPress, handleLongPress }) => {
    return (
        <FlatList
            data={filteredSongs}
            renderItem={({ item }) => <Card song={item} onCardPress={() => handleCardPress(item)} onEditPress={() => handleEditPress(item)} onLongPress={() => handleLongPress(item)} />}
            style={{ width: '100%' }}
        />
    );
};

export default SongList;