import React, { useState, useCallback } from 'react';
import { TouchableWithoutFeedback, View, StyleSheet, Text, TouchableOpacity, Alert, ScrollView } from 'react-native';
import Modal from 'react-native-modal';
import { deleteCover, deleteSong, getSongRatingHistory } from '../database/databaseOperations';
import SongFormModal from './SongFormModal';
import TagsModal from './Tags';
import { globalStyles } from '../styles/global';

const SongOptionsModal = ({ isSongOptionsVisible, closeModal, selectedSong, songs, setSongs, refreshSongsList }) => {
    const [modalsVisibility, setModalsVisibility] = useState({
        formModal: false,
        ratingHistoryModal: false,
        tagsModal: false,
    });
    const [ratingHistory, setRatingHistory] = useState([]);

    const openModal = (modal) => setModalsVisibility({ ...modalsVisibility, [modal]: true });
    const closeModals = () => {
        setModalsVisibility({ formModal: false, ratingHistoryModal: false, tagsModal: false });
        closeModal();
    };

    const handleDeleteCover = async () => {
        try {
            await deleteCover(selectedSong.artist, selectedSong.album);
            closeModal();
        } catch (error) {
            console.error('Error deleting cover:', error);
            Alert.alert('Error', 'Failed to delete cover. Error: ' + error.message);
        }
    };

    const handleDeleteSong = () => {
        if (!selectedSong) return;
        Alert.alert(
            "Delete Song",
            `Are you sure you want to delete "${selectedSong.title}"?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    onPress: async () => {
                        try {
                            await deleteSong(selectedSong.id);
                            setSongs(songs.filter(song => song.id !== selectedSong.id));
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

    const handleCheckCoverPath = () => {
        Alert.alert(
            "Cover Path",
            `Cover path for the song "${selectedSong.title}" by "${selectedSong.artist}" is: ${selectedSong.cover_path}`,
            [{ text: "OK" }]
        );
    };

    const handleViewRatingHistory = async () => {
        try {
            const history = await getSongRatingHistory(selectedSong.id);
            setRatingHistory(history);
            openModal('ratingHistoryModal');
            closeModal();
        } catch (error) {
            console.error('Error fetching song rating history:', error);
            Alert.alert('Error', 'Failed to fetch rating history. Error: ' + error.message);
        }
    };

    const formatDateTime = (datetimeString) => {
        const date = new Date(datetimeString);
        return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()} - ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
    };

    const renderOptionButton = (onPress, text, style = {}) => (
        <TouchableOpacity onPress={onPress} style={{ ...styles.optionButton, ...style }}>
            <Text style={styles.optionText}>{text}</Text>
        </TouchableOpacity>
    );

    return (
        <View>
            <Modal
                isVisible={isSongOptionsVisible}
                onBackdropPress={closeModal}
                onBackButtonPress={closeModal}
                useNativeDriverForBackdrop
                hideModalContentWhileAnimating
                animationInTiming={100}
                animationOutTiming={100}
                style={styles.fullScreenModal}
            >
                <TouchableWithoutFeedback onPress={closeModal}>
                    <View style={styles.modalContainer}>
                        <TouchableWithoutFeedback>
                            <View style={styles.optionsContainer}>
                                <Text style={styles.optionsTitle}>Song Options</Text>
                                <Text style={{ ...styles.optionsTitle, fontSize: 14, marginBottom: 12 }}>{selectedSong.title}</Text>
                                {renderOptionButton(() => openModal('formModal'), 'Edit Song')}
                                {renderOptionButton(handleViewRatingHistory, 'View Rating History', { backgroundColor: globalStyles.yellow1 })}
                                {renderOptionButton(() => openModal('tagsModal'), 'Tags', { backgroundColor: globalStyles.pink1 })}
                                {renderOptionButton(handleDeleteSong, 'Delete Song', { backgroundColor: globalStyles.red2 })}
                                <View style={styles.row}>
                                    {renderOptionButton(handleDeleteCover, 'Reload Cover', styles.optionButtonSmall)}
                                    {renderOptionButton(handleCheckCoverPath, 'Check Cover Path', { ...styles.optionButtonSmall, backgroundColor: globalStyles.purple2 })}
                                </View>
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>

            <SongFormModal
                isFormModalVisible={modalsVisibility.formModal}
                closeModal={closeModals}
                selectedSong={selectedSong}
                songs={songs}
                setSongs={setSongs}
                refreshSongsList={refreshSongsList}
            />

            <TagsModal
                isTagsModalVisible={modalsVisibility.tagsModal}
                closeModals={closeModals}
                selectedSong={selectedSong}
            />

            <Modal
                isVisible={modalsVisibility.ratingHistoryModal}
                onBackdropPress={closeModals}
                onBackButtonPress={closeModals}
                useNativeDriverForBackdrop
                hideModalContentWhileAnimating
                animationInTiming={100}
                animationOutTiming={100}
                style={styles.fullScreenModal}
            >
                <View style={styles.centeredView}>
                    <View style={styles.modalView}>
                        <Text style={{ ...styles.modalText, borderWidth: 0, padding: 0, marginBottom: 15 }}>{`Rating History for "${selectedSong.title}"\nby ${selectedSong.artist}`}</Text>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            {ratingHistory.map((item, index) => (
                                <Text key={index} style={styles.modalText}>{`${formatDateTime(item.datetime)}\nRating: ${item.rating}`}</Text>
                            ))}
                        </ScrollView>
                        {renderOptionButton(() => setModalsVisibility({ ...modalsVisibility, ratingHistoryModal: false }), 'Close', { backgroundColor: 'darkred', marginBottom: 0 })}
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    fullScreenModal: {
        margin: 0,
        justifyContent: 'center',
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    optionsContainer: {
        backgroundColor: globalStyles.modalBackgroundColor,
        borderRadius: 8,
        padding: 16,
        width: '90%',
    },
    optionsTitle: {
        color: 'white',
        fontSize: 20,
        marginBottom: 2,
    },
    optionButton: {
        backgroundColor: globalStyles.blue2,
        borderRadius: 8,
        padding: 10,
        marginBottom: 16,
    },
    optionButtonSmall: {
        backgroundColor: globalStyles.green2,
        borderRadius: 8,
        padding: 5,
        width: '48%',
        justifyContent: 'center',
    },
    optionText: {
        color: 'white',
        textAlign: 'center',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
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
        backgroundColor: globalStyles.modalBackgroundColor,
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