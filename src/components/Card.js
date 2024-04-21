// This file contains the Card component which is used to display a song's information in a card format.
// It includes the song's title, artist, album, release date, rating, and an edit button that allows users to edit the song's information or delete.

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';

const Card = ({ song, onCardPress, onEditPress, onLongPress }) => {
    // Function to render the color of the rating based on its value
    const renderRatingColor = () => {
        if (song.rating === 0) return 'grey';
        if (song.rating <= 2.5) return 'red';
        if (song.rating > 2.5 && song.rating <= 5) return 'orange';
        if (song.rating > 5 && song.rating <= 7.5) return 'yellow';
        if (song.rating > 7.5 && song.rating < 10) return 'lime';
        return 'turquoise';
    };

    return (
        <TouchableOpacity 
            onPress={onCardPress}
            onLongPress={onLongPress} 
            delayLongPress={100}
            style={styles.cardContainer}
        >
            <View style={styles.songInfoContainer}>
                <View style={styles.songInfoTextContainer}>
                    <Text style={styles.songTitle}>{song.title || 'Unknown Title'}</Text>
                    <Text style={styles.songInfo}>{song.artist || 'Unknown Artist'}</Text>
                    <Text style={styles.songInfo}>{song.album || 'Unknown Album'}</Text>
                    <Text style={styles.songInfo}>{song.release || 'Unknown Release Date'}</Text>
                </View>
            </View>
            
            <View style={styles.ratingAndEditContainer}>
                <View style={styles.ratingContainer}>
                    <Icon name="star" size={24} color={renderRatingColor()} />
                    <Text style={styles.ratingText}>{song.rating ? (song.rating.toFixed(1)) : 'N/A'}</Text>
                </View>
                <TouchableOpacity onPress={onEditPress} style={styles.editButton}>
                    <Icon name="more-vertical" size={24} color="white" />
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    cardContainer: {
        flexDirection: 'row',
        backgroundColor: '#1e272e',
        borderRadius: 8,
        padding: 10,
        marginBottom: 10,
        width: '100%',
        height: 80,
    },
    songInfoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    image: {
        width: 65,
        height: 65,
        marginRight: 20,
    },
    songInfoTextContainer: {
        flex: 1,
    },
    songInfo: {
        color: 'white',
        fontSize: 10,
        flexWrap: 'wrap',
    },
    songTitle: {
        color: 'white',
        fontSize: 14,
        flexWrap: 'wrap',
    },
    ratingAndEditContainer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
    },
    ratingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    ratingText: {
        color: 'white',
        fontSize: 16,
        marginLeft: 5,
    },
    editButton: {
        marginLeft: 5,
    },
});

export default React.memo(Card);