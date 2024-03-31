import React from 'react';
import { Modal, TouchableWithoutFeedback, View, Text, TouchableOpacity } from 'react-native';

const SongOptionsModal = ({ isSongOptionsVisible, setSongOptionsVisible, handleEditSong, handleDeleteSong }) => {
    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={isSongOptionsVisible}
            onRequestClose={() => setSongOptionsVisible(false)}
        >
            <TouchableWithoutFeedback onPress={() => setSongOptionsVisible(false)}>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <TouchableWithoutFeedback onPress={() => {}}>
                        <View style={{ backgroundColor: '#1e272e', borderRadius: 8, padding: 16, width: '80%' }}>
                            <Text style={{ color: 'white', fontSize: 16, marginBottom: 16 }}>Song Options</Text>
                            <TouchableOpacity onPress={handleEditSong} style={{ backgroundColor: 'blue', borderRadius: 8, padding: 10, marginBottom: 16 }}>
                                <Text style={{ color: 'white', textAlign: 'center' }}>Edit Song</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleDeleteSong} style={{ backgroundColor: 'red', borderRadius: 8, padding: 10 }}>
                                <Text style={{ color: 'white', textAlign: 'center' }}>Delete Song</Text>
                            </TouchableOpacity>
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};

export default SongOptionsModal;