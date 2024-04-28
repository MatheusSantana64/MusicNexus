// The SongList component is a reusable component that renders a list of songs.
// It uses the FlashList component to render a list of songs as Card components.

import React from 'react';
import { View } from 'react-native';
import Card from './Card';
import { FlashList } from '@shopify/flash-list';

const SongList = ({ songs, fetchMoreSongs, hasMoreSongs, setSongs }) => {
    const CARD_HEIGHT = 90;

    const handleScroll = (event) => {
        const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
        const isEndReached = layoutMeasurement.height + contentOffset.y >= contentSize.height - 2000;
        if (isEndReached && hasMoreSongs) {
            fetchMoreSongs();
        }
    };

    const extractKey = (item, index) => String(index);

    const renderCard = ({ item }) => (<Card key={item.id} cardSong={item} songs={songs} setSongs={setSongs} />);

    /* const itemLayout= (data, index) => ({
        length: CARD_HEIGHT,
        offset: CARD_HEIGHT * index,
        index,
    }) */

    // Render the list of songs
    return (
        <View style={{flex: 1, height: '100%', width: '100%',}}>
            <FlashList
                data={songs}
                keyExtractor={extractKey}
                estimatedItemSize={CARD_HEIGHT} // FlashList requirement
                renderItem={renderCard}
                onScroll={handleScroll}
                removeClippedSubviews={false}

                // getItemLayout={itemLayout} // No value to FlashList
                //windowSize={31} // Not implemented in FlashList
                //maxToRenderPerBatch={50} // No value to FlashList
                //initialNumToRender={20} // No value to FlashList
            />
        </View>
    );
};

export default SongList;