import React, { useState } from 'react';
import { TouchableOpacity, StyleSheet, View, Text } from 'react-native';
import SongFormModal from './SongFormModal';
import { globalStyles } from '../styles/global';

const FloatingButton = ({ songs, setSongs, refreshSongsList }) => {
    const [isFormModalVisible, setFormModalVisible] = useState(false);

    const toggleFormModal = () => {
        setFormModalVisible(!isFormModalVisible);
    };

    return (
        <View>
            <TouchableOpacity onPress={toggleFormModal} style={styles.button}>
                <Text style={styles.buttonText}>+ New Song</Text>
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
        top: 16,
        right: 6,
        zIndex: 1,
        justifyContent: 'center',
        backgroundColor: globalStyles.green1,
        paddingHorizontal: 6,
        borderRadius: 5,
        height: 40,
        width: 100,
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        textAlign: 'center',
    },
});

export default FloatingButton;