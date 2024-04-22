// The SongOptionsModal component is a reusable modal component that displays options for a song.
// It allows users to edit or delete a song by providing buttons for each action.

import React from 'react';
import { TouchableWithoutFeedback, View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import Modal from 'react-native-modal';
import { generateCacheKey } from '../api/MusicBrainzAPI';
import { deleteImageFromCache } from '../utils/cacheManager';

const SongOptionsModal = ({
    isSongOptionsVisible,
    setSongOptionsVisible,
    handleEditSong,
    handleDeleteSong,
    selectedSong,
}) => {

    // Function to handle the closing of the modal when the user taps outside of it
    const handleModalClose = () => setSongOptionsVisible(false);

    // Function to handle the delete of the cover image for the selected song
    const handleDeleteCover = () => {
        console.log(`Deleting cover for song: Artist - ${selectedSong.artist}, Album - ${selectedSong.album}`);
        const cacheKey = generateCacheKey(selectedSong.artist, selectedSong.album);
        deleteImageFromCache(cacheKey);
        setSongOptionsVisible(false);
    };

    // Render the modal with the song options
    return (
        <Modal
            isVisible={isSongOptionsVisible}
            onBackdropPress={handleModalClose}
            onBackButtonPress={handleModalClose}
            useNativeDriverForBackdrop={true}
            hideModalContentWhileAnimating={true}
            animationInTiming={100}
            animationOutTiming={100}
            children={
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

                                <TouchableOpacity onPress={handleDeleteCover} style={styles.reloadButton}>
                                    <Text style={styles.optionText}>Reload Cover</Text>
                                </TouchableOpacity>
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            }
        >
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
    reloadButton: {
        backgroundColor: 'green',
        borderRadius: 8,
        padding: 10,
        marginBottom: 16,
    },
});   

export default SongOptionsModal;