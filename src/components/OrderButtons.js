// src/components/OrderButtons.js

import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';

const OrderButtons = ({ order, setOrder, orderDirection, setOrderDirection, setMusicOrder = () => {}, setMusicOrderDirection = () => {} }) => {
    const toggleOrder = () => {
        let newOrder;
        switch (order) {
            case 'title':
                newOrder = 'artist';
                break;
            case 'artist':
                newOrder = 'release';
                break;
            case 'release':
                newOrder = 'rating';
                break;
            default:
                newOrder = 'title';
                break;
        }
        setOrder(newOrder);
        setMusicOrder(newOrder);
    };

    const toggleOrderDirection = () => {
        const newDirection = orderDirection === 'asc' ? 'desc' : 'asc';
        setOrderDirection(newDirection);
        setMusicOrderDirection(newDirection);
    };

    const getOrderColor = () => {
        switch (order) {
            case 'title':
                return 'aqua';
            case 'artist':
                return 'violet';
            case 'release':
                return 'sandybrown';
            default:
                return 'yellow';
        }
    };

    const getOrderDirectionColor = () => {
        return orderDirection === 'asc' ? 'springgreen' : 'tomato';
    };

    return (
        <View style={styles.orderButtonsContainer}>
            <TouchableOpacity onPress={toggleOrder} style={styles.orderButton}>
                <Text style={[{color: getOrderColor()}]}>Sort by {order.charAt(0).toUpperCase() + order.slice(1)}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={toggleOrderDirection} style={styles.orderDirectionButton}>
                {orderDirection === 'asc' ? (
                    <Icon name="chevron-up" size={18} color={getOrderDirectionColor()} />
                ) : (
                    <Icon name="chevron-down" size={18} color={getOrderDirectionColor()} />
                )}
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    orderButtonsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    orderButton: {
        marginLeft: 16,
    },
    orderDirectionButton: {
        marginLeft: 10,
    },
});

export default OrderButtons;