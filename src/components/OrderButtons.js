import React, { useCallback, useMemo } from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { orderButtonsStyles as styles } from '../styles/componentsStyles';

const OrderButtons = ({ order, setOrder, orderDirection, setOrderDirection, setMusicOrder = () => {}, setMusicOrderDirection = () => {} }) => {
    const toggleOrder = useCallback(() => {
        const orders = ['title', 'artist', 'release', 'rating'];
        const newOrder = orders[(orders.indexOf(order) + 1) % orders.length];
        setOrder(newOrder);
        setMusicOrder(newOrder);
    }, [order, setOrder, setMusicOrder]);

    const toggleOrderDirection = useCallback(() => {
        const newDirection = orderDirection === 'asc' ? 'desc' : 'asc';
        setOrderDirection(newDirection);
        setMusicOrderDirection(newDirection);
    }, [orderDirection, setOrderDirection, setMusicOrderDirection]);

    const orderColors = useMemo(() => ({
        title: 'aqua',
        artist: 'violet',
        release: 'sandybrown',
        rating: 'yellow'
    }), []);

    const getOrderColor = useMemo(() => orderColors[order] || 'yellow', [order, orderColors]);

    const getOrderDirectionColor = useMemo(() => orderDirection === 'asc' ? 'springgreen' : 'tomato', [orderDirection]);

    return (
        <View style={styles.orderButtonsContainer}>
            <TouchableOpacity onPress={toggleOrder} style={styles.orderButton}>
                <Text style={[{color: getOrderColor}]}>Sort by {order.charAt(0).toUpperCase() + order.slice(1)}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={toggleOrderDirection} style={styles.orderDirectionButton}>
                {orderDirection === 'asc' ? (
                    <Icon name="chevron-up" size={18} color={getOrderDirectionColor} />
                ) : (
                    <Icon name="chevron-down" size={18} color={getOrderDirectionColor} />
                )}
            </TouchableOpacity>
        </View>
    );
};

export default OrderButtons;