import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';

const FloatingButton = ({ onPress }) => {
    return (
        <TouchableOpacity onPress={onPress} style={{ position: 'absolute', bottom: 30, right:30 }}>
            <Icon name="plus-circle" size={50} color="green" />
        </TouchableOpacity>
    );
};

export default FloatingButton;