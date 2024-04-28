// The FloatingButton component is a reusable component that renders a floating action button with a plus icon.
// It allows users to add new songs by pressing the button.

import React, { useState } from 'react';
import { TouchableOpacity, StyleSheet, View } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import SongFormModal from './SongFormModal';

const FloatingButton = (props) => {
    // Destructure (Necessary for some reason) props to get songs, setSongs, and refreshSongsList
    const { songs, setSongs, refreshSongsList } = props;

    const [isFormModalVisible, setFormModalVisible] = useState(false);

    // Press Floating Button
    const openFormModal = () => {
        setFormModalVisible(true);
    };

    return (
        <View>
            <TouchableOpacity onPress={openFormModal} style={styles.button}>
                <Icon name="plus-circle" size={50} color="green" />
            </TouchableOpacity>

            <SongFormModal
                isFormModalVisible={isFormModalVisible}
                closeModal={() => setFormModalVisible(false)}
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