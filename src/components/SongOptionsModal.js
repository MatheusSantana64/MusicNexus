// The SongOptionsModal component is a reusable modal component that displays options for a song.
// It allows users to edit or delete a song by providing buttons for each action.

import React from 'react';
import { Modal, TouchableWithoutFeedback, View, StyleSheet, Text, TouchableOpacity } from 'react-native';

const SongOptionsModal = ({
    isSongOptionsVisible,
    setSongOptionsVisible,
    handleEditSong,
    handleDeleteSong,
}) => {

    // Function to handle the closing of the modal when the user taps outside of it
    const handleModalClose = () => setSongOptionsVisible(false);

    // Render the modal with the song options
    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={isSongOptionsVisible}
            onRequestClose={handleModalClose}
        >
            <TouchableWithoutFeedback onPress={handleModalClose}>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <TouchableWithoutFeedback onPress={() => {}}>
                        <View style={styles.optionsContainer}>

                            <Text style={styles.optionsTitle}>Song Options</Text>

                            <TouchableOpacity onPress={handleEditSong} style={styles.editButton}>
                                <Text style={styles.optionText}>Edit Song</Text>
                            </TouchableOpacity>

                            <TouchableOpacity onPress={handleDeleteSong} style={styles.deleteButton}>
                                <Text style={styles.optionText}>Delete Song</Text>
                            </TouchableOpacity>

                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    optionsContainer: {
        backgroundColor: '#1e272e',
        borderRadius: 8,
        padding: 16,
        width: '80%',
    },
    optionsTitle: {
        color: 'white',
        fontSize: 16,
        marginBottom: 16,
    },
    editButton: {
        backgroundColor: 'blue',
        borderRadius: 8,
        padding: 10,
        marginBottom: 16,
    },
    deleteButton: {
        backgroundColor: 'red',
        borderRadius: 8,
        padding: 10,
        marginBottom: 16,
    },
    optionText: {
        color: 'white',
        textAlign: 'center',
    },
});   

export default SongOptionsModal;