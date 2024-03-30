import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

const Card = ({ result }) => {
 return (
    <View style={styles.card}>
      <Image
        source={{ uri: result.coverArtUrl }}
        style={styles.coverArt}
      />
      <View style={styles.textContainer}>
        <Text style={styles.title}>{result.title}</Text>
        <Text style={styles.artist}>Artist: {result['artist-credit'][0].name}</Text>
        <Text style={styles.album}>Album: {result['release-group'].title}</Text>
      </View>
    </View>
 );
};

const styles = StyleSheet.create({
    card: {
       flexDirection: 'row',
       alignItems: 'center',
       marginBottom: 10,
       padding: 10,
       borderRadius: 8,
       backgroundColor: '#1e272e',
       width: '100%', // Make the card occupy the full width of its parent
    },
    coverArt: {
       width: 50,
       height: 50,
       marginRight: 10,
    },
    textContainer: {
       flex: 1,
       flexWrap: 'wrap', // Allow text to wrap within the available space
    },
    title: {
       color: 'white',
       fontSize: 16,
    },
    artist: {
       color: 'white',
       fontSize: 12,
    },
    album: {
       color: 'white',
       fontSize: 12,
    },
   });

export default Card;