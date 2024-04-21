// The SongFormModal component is a reusable modal component that displays a song form.
// It allows users to add or edit song information by providing input fields for the song title, artist, album, and release date.

import React from 'react';
import { TouchableWithoutFeedback, StyleSheet, View } from 'react-native';
import SongForm from './SongForm';
import Modal from 'react-native-modal';

const SongFormModal = ({
 isModalVisible,
 setModalVisible,
 selectedSong,
 handleFormSubmit,
 handleEditFormSubmit,
}) => {
    // Function to handle the closing of the modal when the user taps outside of it
    const handleModalClose = () => setModalVisible(false);

    // Function to handle the submission of the form
    const handleFormSubmitWrapper = (song) => {
        // Determine whether to call the edit or add function based if a song is selected
        const submitFunction = selectedSong ? handleEditFormSubmit : handleFormSubmit;
        // Call the appropriate function with the song data
        submitFunction(song);
    };

    // Render the modal with the song form
    return (
        <Modal
            isVisible={isModalVisible}
            onBackdropPress={handleModalClose}
            onBackButtonPress={handleModalClose}
            useNativeDriverForBackdrop={true}
            hideModalContentWhileAnimating={true}
            animationInTiming={100}
            animationOutTiming={100}
            children={
                <TouchableWithoutFeedback onPress={handleModalClose}>
                    <View style={styles.modalContainer}>
                        <TouchableWithoutFeedback onPress={() => {}}>
                            <View>
                                <SongForm
                                    song={selectedSong}
                                    onSubmit={handleFormSubmitWrapper}
                                    isEditMode={!!selectedSong}
                                    onCancel={handleModalClose}
                                />
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
});

export default SongFormModal;