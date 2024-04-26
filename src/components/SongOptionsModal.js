// The SongOptionsModal component is a reusable modal component that displays options for a song.
// It allows users to edit or delete a song by providing buttons for each action.

import React, { useState } from 'react';
import { TouchableWithoutFeedback, View, StyleSheet, Text, TouchableOpacity, Alert } from 'react-native';
import Modal from 'react-native-modal';
import { generateCacheKey } from '../api/MusicBrainzAPI';
import { deleteImageFromCache } from '../utils/cacheManager';
import { db } from '../database/databaseSetup';

import SongFormModal from './SongFormModal';

const SongOptionsModal = ({ isSongOptionsVisible, closeModal, selectedSong, songs, setSongs }) => {
    const [isFormModalVisible, setFormModalVisible] = useState(false);

    // Handle Edit Song (Edit Song Details)
    const openFormModal = () => {
        setFormModalVisible(true);
    };

    const closeModals = () => {
        setFormModalVisible(false);
        closeModal();
    }

    // Function to handle the delete of the cover image for the selected song
    const handleDeleteCover = () => {
        console.log(`Deleting cover for song: Artist - ${selectedSong.artist}, Album - ${selectedSong.album}`);
        const cacheKey = generateCacheKey(selectedSong.artist, selectedSong.album);
        deleteImageFromCache(cacheKey);
        closeModal();
    };

    // Handle Delete Song (Delete Song)
    const handleDeleteSong = () => {
        if (!selectedSong) return;
    
        Alert.alert(
            "Delete Song",
            `Are you sure you want to delete "${selectedSong.title}"?`,
            [
                {
                    text: "Cancel",
                    onPress: () => console.log("Cancel Pressed"),
                    style: "cancel"
                },
                {
                    text: "Delete",
                    onPress: async () => {
                        db.transaction(tx => {
                            tx.executeSql(
                                'DELETE FROM songs WHERE id = ?',
                                [selectedSong.id],
                                () => {
                                    const updatedSongs = songs.filter(song => song.id !== selectedSong.id);
                                    setSongs(updatedSongs);
                                },
                                (_, error) => console.log('Error deleting song:', error)
                            );
                        });
                    }
                }
            ],
            { cancelable: true }
        );
    };

    // Render the modal with the song options
    return (
        <View>
            <Modal
                isVisible={isSongOptionsVisible}
                onBackdropPress={closeModal}
                onBackButtonPress={closeModal}
                useNativeDriverForBackdrop={true}
                hideModalContentWhileAnimating={true}
                animationInTiming={100}
                animationOutTiming={100}
                children={
                    <TouchableWithoutFeedback onPress={closeModal}>
                        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                            <TouchableWithoutFeedback onPress={() => {}}>
                                <View style={styles.optionsContainer}>

                                    <Text style={styles.optionsTitle}>Song Options</Text>

                                    <TouchableOpacity onPress={openFormModal} style={styles.editButton}>
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

            <SongFormModal
                isFormModalVisible={isFormModalVisible}
                closeModal={() => closeModals()}
                selectedSong={selectedSong}
                songs={songs}
                setSongs={setSongs}
            />
        </View>
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