// The SongList component is a reusable component that renders a list of songs.
// It uses the FlatList component to render a list of songs as Card components.

import React, { useCallback } from 'react';
import { View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import Card from './Card';

const SongList = ({ songs, handleCardPress, handleEditPress, handleLongPress, fetchMoreSongs, hasMoreSongs }) => {
    // Wrap the functions with useCallback to prevent unnecessary re-renders
    const handleCardPressCallback = useCallback(handleCardPress, []);
    const handleEditPressCallback = useCallback(handleEditPress, []);
    const handleLongPressCallback = useCallback(handleLongPress, []);

    const CARD_HEIGHT = 90;

    const handleScroll = (event) => {
        const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
        const isEndReached = layoutMeasurement.height + contentOffset.y >= contentSize.height - 2000;
        if (isEndReached && hasMoreSongs) {
            fetchMoreSongs();
        }
    };

    // Render the list of songs
    return (
        <View style={{flex: 1, height: '100%', width: '100%',}}>
            <FlashList
                data={songs}
                renderItem={({ item }) =>
                    <Card song={item}
                        onCardPress={() => handleCardPressCallback(item)}
                        onEditPress={() => handleEditPressCallback(item)}
                        onLongPress={() => handleLongPressCallback(item)}
                    />}
                keyExtractor={item => item.id}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                removeClippedSubviews={true}
                windowSize={21}
                maxToRenderPerBatch={100}
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