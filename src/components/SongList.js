import React, { useCallback, forwardRef } from 'react';
import { View } from 'react-native';
import Card from './Card';
import { FlashList } from '@shopify/flash-list';

const SongList = forwardRef(
    ({ songs, fetchMoreSongs, hasMoreSongs, setSongs, refreshSongsList, onScroll }, ref) => {
        const handleScroll = useCallback(
            event => {
                const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
                const isEndReached =
                    layoutMeasurement.height + contentOffset.y >= contentSize.height - 2000;
                if (isEndReached && hasMoreSongs) {
                    fetchMoreSongs();
                }
                if (onScroll) {
                    onScroll(event);
                }
            },
            [hasMoreSongs, fetchMoreSongs, onScroll]
        );

        const extractKey = useCallback((item, index) => String(index), []);

        const renderCard = useCallback(
            ({ item }) => (
                <Card
                    key={item.id}
                    cardSong={item}
                    songs={songs}
                    setSongs={setSongs}
                    refreshSongsList={refreshSongsList}
                />
            ),
            [songs, setSongs, refreshSongsList]
        );

        return (
            <View style={{ flex: 1, height: '100%', width: '100%' }}>
                <FlashList
                    ref={ref}
                    data={songs}
                    keyExtractor={extractKey}
                    estimatedItemSize={60}
                    renderItem={renderCard}
                    onScroll={handleScroll}
                    removeClippedSubviews={false}
                />
            </View>
        );
    }
);

export default SongList;