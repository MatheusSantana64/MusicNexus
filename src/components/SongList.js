// The SongList component is a reusable component that renders a list of songs.
// It uses the FlatList component to render a list of songs as Card components.

import React, { useCallback } from 'react';
import { View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import Card from './Card';

const SongList = ({ sortedSongs, handleCardPress, handleEditPress, handleLongPress }) => {

    // Wrap the functions with useCallback to prevent unnecessary re-renders
    const handleCardPressCallback = useCallback(handleCardPress, []);
    const handleEditPressCallback = useCallback(handleEditPress, []);
    const handleLongPressCallback = useCallback(handleLongPress, []);

    const CARD_HEIGHT = 90;

    // Render the list of songs
    return (
        <View style={{height: '100%', width: '100%',}}>
            <FlashList
                data={sortedSongs}
                renderItem={({ item }) =>
                    <Card song={item}
                        onCardPress={() => handleCardPressCallback(item)}
                        onEditPress={() => handleEditPressCallback(item)}
                        onLongPress={() => handleLongPressCallback(item)}
                    />}
                keyExtractor={(item) => item.id.toString()}
                removeClippedSubviews={true}
                windowSize={1}
                maxToRenderPerBatch={10}
                initialNumToRender={10}
                getItemLayout={(_, index) => (
                    {length: CARD_HEIGHT, offset: CARD_HEIGHT * index, index}
                )}
                estimatedItemSize={CARD_HEIGHT}
            />
        </View>
    );
};

export default SongList;