// The SongOptionsModal component is a reusable modal component that displays options for a song.
// It allows users to edit or delete a song by providing buttons for each action.

import React, { useState } from 'react';
import { TouchableWithoutFeedback, View, StyleSheet, Text, TouchableOpacity, Alert, Button, ScrollView } from 'react-native';
import Modal from 'react-native-modal';
import { deleteCover, deleteSong, getSongRatingHistory, getTagsForSong } from '../database/databaseOperations';
import SongFormModal from './SongFormModal';
import TagsModal from './Tags';

const SongOptionsModal = ({ isSongOptionsVisible, closeModal, selectedSong, songs, setSongs, refreshSongsList }) => {
    const [isFormModalVisible, setFormModalVisible] = useState(false);

    const [isRatingHistoryModalVisible, setRatingHistoryModalVisible] = useState(false);
    const [ratingHistory, setRatingHistory] = useState([]);

    const [isTagsModalVisible, setTagsModalVisible] = useState(false);
    const [associatedTags, setAssociatedTags] = useState([]);

    // Handle Edit Song (Edit Song Details)
    const openFormModal = () => {
        setFormModalVisible(true);
    };

    // Handle Edit Song (Edit Song Details)
    const openTagsModal = () => {
        setTagsModalVisible(true);
    };

    const closeModals = () => {
        setFormModalVisible(false);
        setRatingHistoryModalVisible(false);
        setTagsModalVisible(false);
        closeModal();
    }

    // Function to handle the delete of the cover image for the selected song
    const handleDeleteCover = async () => {
        try {
            await deleteCover(selectedSong.artist, selectedSong.album);
            closeModal();
        } catch (error) {
            console.error('Error deleting cover:', error);
            Alert.alert('Error', 'Failed to delete cover. Error: ' + error.message);
        }
    };

    // Function to handle the delete of a song
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
                        try {
                            await deleteSong(selectedSong.id);
                            const updatedSongs = songs.filter(song => song.id !== selectedSong.id);
                            setSongs(updatedSongs);
                            closeModal();
                        } catch (error) {
                            console.error('Error deleting song:', error);
                            Alert.alert('Error', 'Failed to delete song. Error: ' + error.message);
                        }
                    }
                }
            ],
            { cancelable: true }
        );
    };

    // Function to handle checking the cover path of the selected song
    const handleCheckCoverPath = () => {
        Alert.alert(
            "Cover Path",
            `Cover path for the song "${selectedSong.title}" by "${selectedSong.artist}" is: ${selectedSong.cover_path}`,
            [{ text: "OK" }]
        );
    };

    // Function to handle viewing the rating history
    const handleViewRatingHistory = async () => {
        try {
            const history = await getSongRatingHistory(selectedSong.id);
            setRatingHistory(history); // Store the fetched history in the state
            setRatingHistoryModalVisible(true); // Show the modal
            closeModal();
        } catch (error) {
            console.error('Error fetching song rating history:', error);
            Alert.alert('Error', 'Failed to fetch rating history. Error: ' + error.message);
        }
    };

    const formatDateTime = (datetimeString) => {
        const date = new Date(datetimeString);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are zero based.
        const year = date.getFullYear();
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');

        return `${day}/${month}/${year} - ${hours}:${minutes}:${seconds}`;
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
                                    <Text style={{ ...styles.optionsTitle, fontSize: 14, marginBottom: 12 }}>{selectedSong.title}</Text>

                                    <TouchableOpacity onPress={openFormModal} style={styles.optionButton}>
                                        <Text style={styles.optionText}>Edit Song</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity onPress={handleViewRatingHistory} style={{ ...styles.optionButton, backgroundColor: 'darkgoldenrod' }}>
                                        <Text style={styles.optionText}>View Rating History</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity onPress={openTagsModal} style={{ ...styles.optionButton, backgroundColor: 'mediumvioletred' }}>
                                        <Text style={styles.optionText}>Open Tags</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity onPress={handleDeleteSong} style={{ ...styles.optionButton, backgroundColor: 'darkred' }}>
                                        <Text style={styles.optionText}>Delete Song</Text>
                                    </TouchableOpacity>

                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%' }}>
                                        <TouchableOpacity onPress={handleDeleteCover} style={styles.optionButtonSmall}>
                                            <Text style={styles.optionText}>Reload Cover</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity onPress={handleCheckCoverPath} style={{ ...styles.optionButtonSmall, backgroundColor: 'rebeccapurple'}}>
                                            <Text style={styles.optionText}>Check Cover Path</Text>
                                        </TouchableOpacity>
                                    </View>
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
                refreshSongsList={refreshSongsList}
            />

            <TagsModal
                isTagsModalVisible={isTagsModalVisible}
                closeModals={() => closeModals()}
                selectedSong={selectedSong}
            />

            <Modal
                isVisible={isRatingHistoryModalVisible}
                onBackdropPress={closeModals}
                onBackButtonPress={closeModals}
                useNativeDriverForBackdrop={true}
                hideModalContentWhileAnimating={true}
                animationInTiming={100}
                animationOutTiming={100}
                onRequestClose={() => {
                    setRatingHistoryModalVisible(!isRatingHistoryModalVisible);
                }}
                children={
                    <View style={styles.centeredView}>
                        <View style={styles.modalView}>
                            <Text style={{ ...styles.modalText, borderWidth: 0, padding: 0, marginBottom: 15}}>{`Rating History for "${selectedSong.title}"\nby ${selectedSong.artist}`}</Text>
                            <ScrollView showsVerticalScrollIndicator={false}>
                                {ratingHistory.map((item, index) => (
                                    <Text key={index} style={styles.modalText}>{`${formatDateTime(item.datetime)}\nRating: ${item.rating}`}</Text>
                                ))}
                            </ScrollView>
                            <TouchableOpacity onPress={() => setRatingHistoryModalVisible(false)} style={{ ...styles.optionButton, backgroundColor: 'darkred', marginBottom: 0}}>
                                <Text style={styles.optionText}>Close</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                }
            >
            </Modal>
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
        fontSize: 20,
        marginBottom: 2,
    },
    optionButton: {
        backgroundColor: 'darkblue',
        borderRadius: 8,
        padding: 10,
        marginBottom: 16,
    },
    optionButtonSmall: {
        backgroundColor: 'darkgreen',
        borderRadius: 8,
        padding: 10,
        marginBottom: 16,
        width: '48%',
        padding: 5,
        marginBottom: 0
    },
    optionText: {
        color: 'white',
        textAlign: 'center',
    },

    centeredView: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        marginTop: 22,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalView: {
        margin: 40,
        width: '80%',
        backgroundColor: "#1e272e",
        borderRadius: 20,
        padding: 35,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5
    },
    modalText: {
        marginBottom: 10,
        textAlign: "center",
        color: 'white',
        fontSize: 16,
        borderColor: 'grey',
        borderWidth: 1,
        borderRadius: 8,
        padding: 5
    },
});

export default SongOptionsModal;