// The Card component is a reusable component that renders a card with song information.
// It displays the song title, artist, album, release date, rating, and an edit icon.

import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';

const Card = ({ song, onCardPress, onEditPress, onLongPress }) => {
    // Function to render song information with a fallback text
    const renderSongInfo = (info, fallbackText) => (
        <Text style={{ color: 'white', fontSize: 10 }}>
            {song[info] ? song[info] : fallbackText}
        </Text>
    );

    // Function to render the color of the rating based on its value
    const renderRatingColor = () => {
        if (song.rating === 0) return 'grey';
        if (song.rating <= 2.5) return 'red';
        if (song.rating > 2.5 && song.rating <= 5) return 'orange';
        if (song.rating > 5 && song.rating <= 7.5) return 'yellow';
        if (song.rating > 7.5 && song.rating < 10) return 'green';
        return 'blue';
    };

    return (
        <TouchableOpacity onPress={onCardPress} onLongPress={onLongPress} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1e272e', borderRadius: 8, padding: 10, marginBottom: 10, width: '100%' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Image
                    source={{ uri: 'https://via.placeholder.com/50' }} // Use a URL for the placeholder image
                    style={{ width: 65, height: 65, marginRight: 20 }}
                />
                <View>
                    <Text style={{ color: 'white', fontSize: 14 }}>{song.title || 'Unknown Title'}</Text>
                    {renderSongInfo('artist', 'Unknown Artist')}
                    {renderSongInfo('album', 'Unknown Album')}
                    {renderSongInfo('release', 'Unknown Release Date')}
                </View>
            </View>
            
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Icon name="star" size={24} color={renderRatingColor()} />
                    <Text style={{ color: 'white', fontSize: 16, marginLeft: 5 }}>{song.rating ? (song.rating.toFixed(1)) : 'N/A'}</Text>
                </View>
                <TouchableOpacity onPress={onEditPress} style={{ marginLeft: 5 }}>
                    <Icon name="more-vertical" size={24} color="white" />
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );
};

export default Card;