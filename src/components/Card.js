import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';

const Card = ({ song, onCardPress, onEditPress, onLongPress }) => {
    return (
        <TouchableOpacity onPress={onCardPress} onLongPress={onLongPress} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1e272e', borderRadius: 8, padding: 10, marginBottom: 10, width: '100%' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Image
                    source={{ uri: 'https://via.placeholder.com/50' }} // Use a URL for the placeholder image
                    style={{ width: 65, height: 65, marginRight: 20 }}
                />
                <View>
                    <Text style={{ color: 'white', fontSize: 14 }}>{song.title ? song.title : 'Unknown Title'}</Text>
                    <Text style={{ color: 'white', fontSize: 10 }}>{song.artist ? song.artist : 'Unknown Artist'}</Text>
                    <Text style={{ color: 'white', fontSize: 10 }}>{song.album ? song.album : 'Unknown Album'}</Text>
                    <Text style={{ color: 'white', fontSize: 10 }}>{song.release ? song.release : 'Unknown Release Date'}</Text>
                </View>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Icon name="star" size={24} color={
                        song.rating === 0 ? 'grey' :
                        song.rating <= 2.5 ? 'red' :
                        song.rating > 2.5 && song.rating <= 5 ? 'orange' :
                        song.rating > 5 && song.rating <= 7.5 ? 'yellow' :
                        song.rating > 7.5 && song.rating < 10 ? 'green' :
                        'blue'
                    } />
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