import React, { useRef, useCallback } from 'react';
import { TouchableWithoutFeedback, StyleSheet, View, TextInput, Button, Dimensions, TouchableOpacity } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Modal from 'react-native-modal';
import { submitForm } from '../database/databaseOperations';
import { globalStyles } from '../styles/global';

const SongFormModal = ({ isFormModalVisible, closeModal, selectedSong, songs, setSongs, refreshSongsList }) => {
    const [title, setTitle] = React.useState(selectedSong ? selectedSong.title : '');
    const [artist, setArtist] = React.useState(selectedSong ? selectedSong.artist : '');
    const [album, setAlbum] = React.useState(selectedSong ? selectedSong.album : '');
    const [release, setRelease] = React.useState(selectedSong ? selectedSong.release : new Date().toISOString().split('T')[0]);
    const [datePickerVisible, setDatePickerVisible] = React.useState(false);
    const [editMode, setEditMode] = React.useState(!!selectedSong);

    const titleRef = useRef(null);
    const artistRef = useRef(null);
    const albumRef = useRef(null);

    const constructSongData = useCallback(() => ({
        id: editMode ? selectedSong.id : null,
        title: title.trim() || "Unknown Title",
        artist: artist.trim() || "Unknown Artist",
        album: album.trim() || "Unknown Album",
        release: release || "1900-01-01",
        rating: editMode ? selectedSong.rating : 0,
        cover_path: null
    }), [editMode, selectedSong, title, artist, album, release]);

    const clearForm = useCallback(() => {
        setTitle('');
        setArtist('');
        setAlbum('');
        setRelease(new Date().toISOString().split('T')[0]);
    }, []);

    const handleSubmit = useCallback(async () => {
        const songData = constructSongData();
        await submitForm(songData, editMode);
        if (editMode) {
            const updatedSongs = songs.map(song => song.id === songData.id ? songData : song);
            setSongs(updatedSongs);
        } else {
            clearForm();
            refreshSongsList();
        }
        closeModal();
    }, [constructSongData, editMode, songs, setSongs, clearForm, refreshSongsList, closeModal]);

    const handleAddAnotherSong = useCallback(async () => {
        const songData = constructSongData();
        await submitForm(songData, editMode);
        setTitle('');
        titleRef.current.focus();
        setEditMode(false);
    }, [constructSongData, editMode]);

    return (
        <View style={styles.absoluteContainer}>
            <Modal
                isVisible={isFormModalVisible}
                onBackdropPress={closeModal}
                onBackButtonPress={closeModal}
                useNativeDriverForBackdrop
                hideModalContentWhileAnimating
                animationInTiming={100}
                animationOutTiming={100}
            >
                <TouchableWithoutFeedback onPress={closeModal}>
                    <View style={styles.modalContainer}>
                        <TouchableWithoutFeedback onPress={() => {}}>
                            <View>
                                <View style={styles.formContainer}>
                                    <TextInput
                                        ref={titleRef}
                                        placeholder="Title"
                                        value={title}
                                        onChangeText={setTitle}
                                        onSubmitEditing={() => artistRef.current?.focus()}
                                        style={styles.input}
                                        placeholderTextColor="grey"
                                    />
                                    <TextInput
                                        ref={artistRef}
                                        placeholder="Artist"
                                        value={artist}
                                        onChangeText={setArtist}
                                        onSubmitEditing={() => albumRef.current?.focus()}
                                        style={styles.input}
                                        placeholderTextColor="grey"
                                    />
                                    <TextInput
                                        ref={albumRef}
                                        placeholder="Album"
                                        value={album}
                                        onChangeText={setAlbum}
                                        style={styles.input}
                                        placeholderTextColor="grey"
                                    />
                                    <TouchableOpacity onPress={() => setDatePickerVisible(true)}>
                                        <TextInput
                                            placeholder="Release Date"
                                            value={release}
                                            editable={false}
                                            style={styles.input}
                                            placeholderTextColor="grey"
                                        />
                                    </TouchableOpacity>
                                    {datePickerVisible && (
                                        <DateTimePicker
                                            value={new Date(release + 'T00:00:00')}
                                            mode="date"
                                            display="default"
                                            onChange={(event, selectedDate) => {
                                                setDatePickerVisible(false);
                                                if (selectedDate) {
                                                    const localDate = new Date(selectedDate.getTime() - selectedDate.getTimezoneOffset() * 60000);
                                                    setRelease(localDate.toISOString().split('T')[0]);
                                                }
                                            }}
                                        />
                                    )}
                                    <View style={styles.buttonContainer}>
                                        <Button title={editMode ? "Save Changes" : "Add Song"} onPress={handleSubmit} color={globalStyles.defaultButtonColor} />
                                    </View>
                                    <View style={[styles.buttonContainer, styles.marginTop]}>
                                        <Button title={editMode ? "Save Changes and Add Another Song From This Album" : "Add Another Song From This Album"} onPress={handleAddAnotherSong} color={globalStyles.green2} />
                                    </View>
                                    <View style={[styles.buttonContainer, styles.marginTop]}>
                                        <Button title="Cancel" onPress={closeModal} color={globalStyles.red2}/>
                                    </View>
                                </View>
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    absoluteContainer: {
        backgroundColor: '#090909',
        position: 'absolute',
        right: 0,
        bottom: 0,
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    formContainer: {
        backgroundColor: globalStyles.modalBackgroundColor,
        borderRadius: 8,
        padding: 16,
        width: Dimensions.get('window').width * 0.8,
    },
    input: {
        backgroundColor: globalStyles.gray3,
        borderRadius: 8,
        color: 'white',
        height: 48,
        paddingHorizontal: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: globalStyles.gray2,
        textAlignVertical: 'center',
    },
    buttonContainer: {
        borderRadius: 5,
        overflow: 'hidden',
    },
    marginTop: {
        marginTop: 10,
    },
});

export default SongFormModal;