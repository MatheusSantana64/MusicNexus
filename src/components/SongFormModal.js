import React from 'react';
import { Modal, TouchableWithoutFeedback, View } from 'react-native';
import SongForm from './SongForm';

const SongFormModal = ({ isModalVisible, setModalVisible, selectedSong, handleFormSubmit, handleEditFormSubmit, onCancel }) => {
    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={isModalVisible}
            onRequestClose={() => setModalVisible(false)}
        >
            <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <TouchableWithoutFeedback onPress={() => {}}>
                        <View>
                            <SongForm
                                song={selectedSong}
                                onSubmit={selectedSong ? handleEditFormSubmit : handleFormSubmit}
                                isEditMode={!!selectedSong}
                                onCancel={() => setModalVisible(false)} // Pass the function to close the modal
                            />
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};

export default SongFormModal;