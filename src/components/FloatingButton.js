import React, { useState } from 'react';
import { TouchableOpacity, StyleSheet, View } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import SongFormModal from './SongFormModal';

const FloatingButton = ({ songs, setSongs, refreshSongsList }) => {
    const [isFormModalVisible, setFormModalVisible] = useState(false);

    const toggleFormModal = () => {
        setFormModalVisible(!isFormModalVisible);
    };

    return (
        <View>
            <TouchableOpacity onPress={toggleFormModal} style={styles.button}>
                <Icon name="plus-circle" size={40} color="green" />
            </TouchableOpacity>

            <SongFormModal
                isFormModalVisible={isFormModalVisible}
                closeModal={toggleFormModal}
                selectedSong={null}
                songs={songs}
                setSongs={setSongs}
                refreshSongsList={refreshSongsList}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    button: {
        position: 'absolute',
        bottom: 30,
        right: 30,
    },
});

export default FloatingButton;