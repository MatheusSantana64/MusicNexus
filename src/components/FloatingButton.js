import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';

const FloatingButton = ({ onPress }) => {
    return (
        <View style={{ position: 'absolute', bottom: 20, right:20 }}>
            <TouchableOpacity onPress={onPress} style={{ padding: 10 }}>
                <Icon name="plus-circle" size={50} color="green" />
            </TouchableOpacity>
        </View>
    );
};

export default FloatingButton;