// Card.js
import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';

const Card = ({ song, onCardPress }) => {
    return (
        <TouchableOpacity onPress={onCardPress} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1e272e', borderRadius: 8, padding: 16, marginBottom: 16, width: '100%' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Image
                    source={{ uri: 'https://via.placeholder.com/50' }} // Use a URL for the placeholder image
                    style={{ width: 50, height: 50, marginRight: 16 }}
                />
                <View>
                    <Text style={{ color: 'white', fontSize: 16 }}>{song.title}</Text>
                    <Text style={{ color: 'white', fontSize: 12 }}>Artist: {song.artist}</Text>
                    <Text style={{ color: 'white', fontSize: 12 }}>Album: {song.album}</Text>
                    <Text style={{ color: 'white', fontSize: 12 }}>{song.release}</Text>
                </View>
            </View>
            <View style={{ flexDirection: 'column', justifyContent: 'space-between', alignItems: 'center' }}>
                <TouchableOpacity>
                    <Icon name="star" size={24} color="yellow" />
                </TouchableOpacity>
                <TouchableOpacity style={{ marginTop: 16 }}>
                    <Icon name="plus-circle" size={24} color="white" />
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );
};

export default Card;