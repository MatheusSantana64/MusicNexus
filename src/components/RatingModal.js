import React, { useState, useEffect, useCallback } from 'react';
import { View, TouchableOpacity, Text, ScrollView, Alert, StyleSheet } from 'react-native';
import { Rating } from 'react-native-ratings';
import Modal from 'react-native-modal';
import Checkbox from 'expo-checkbox';
import Icon from 'react-native-vector-icons/Feather';

import { insertTag, addTag, getTags, getTagsFromSongTags, getTagById, removeTag, deleteTag } from '../database/databaseOperations';
import ColorPickerComponent from './ColorPicker';
import EditTagModal from './EditTagModal';
import { globalStyles } from '../styles/global';

const RatingModal = ({ 
    isRatingModalVisible, 
    closeModal, 
    handleRatingSelect, 
    selectedSong, 
    songs, 
    setSongs,
    onTagsChange
}) => {
    const [rating, setRating] = useState(selectedSong.rating);
    const [tags, setTags] = useState([]);
    const [associatedTags, setAssociatedTags] = useState([]);
    const [newTagName, setNewTagName] = useState('');
    const [newTagColor, setNewTagColor] = useState(globalStyles.defaultTagColor);
    const [isColorPickerModalVisible, setIsColorPickerModalVisible] = useState(false);
    const [isEditModalVisible, setIsEditModalVisible] = useState(false);
    const [tagToEdit, setTagToEdit] = useState(null);

    useEffect(() => {
        if (isRatingModalVisible) {
            fetchTags();
            fetchAssociatedTags();
        }
    }, [isRatingModalVisible]);

    const fetchTags = useCallback(async () => {
        try {
            const fetchedTags = await getTags();
            setTags(fetchedTags);
        } catch (error) {
            console.error('Failed to fetch tags:', error);
            Alert.alert('Error', 'Failed to fetch tags.');
        }
    }, []);

    const fetchAssociatedTags = useCallback(async () => {
        try {
            const fetchedAssociatedTags = await getTagsFromSongTags(selectedSong.id);
            setAssociatedTags(fetchedAssociatedTags);
        } catch (error) {
            console.error('Failed to fetch associated tags:', error);
            Alert.alert('Error', 'Failed to fetch associated tags.');
        }
    }, [selectedSong.id]);

    const handleRatingSubmit = () => {
        if (rating === selectedSong.rating) {
            closeModal();
            return;
        }
        const updatedSongs = songs.map(song => song.id === selectedSong.id ? { ...song, rating } : song);
        setSongs(updatedSongs);
        handleRatingSelect(rating);
    };

    const handleTagToggle = useCallback(async (tagId) => {
        try {
            if (associatedTags.some(associatedTag => associatedTag.tag_id === tagId)) {
                await removeTag(selectedSong.id, tagId);
            } else {
                await addTag(selectedSong.id, tagId);
            }
            await fetchAssociatedTags();
            onTagsChange();
        } catch (error) {
            console.error('Failed to toggle tag:', error);
            Alert.alert('Error', 'Failed to update tag.');
        }
    }, [associatedTags, selectedSong.id, fetchAssociatedTags, onTagsChange]);

    const handleEditTag = async (tagId) => {
        const editedTag = await getTagById(tagId);
        if (!editedTag) {
            Alert.alert('Error', 'Tag not found');
            return;
        }
        setTagToEdit(editedTag);
        setIsEditModalVisible(true);
    };

    const handleDeleteTag = useCallback(async (tagId, tagName) => {
        Alert.alert(
            `Delete Tag "${tagName}"?`,
            `Are you sure you want to delete this tag? It will be removed from all songs that use it.`,
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'OK', onPress: async () => {
                    try {
                        await deleteTag(tagId);
                        setTags(tags.filter(tag => tag.id !== tagId));
                        await fetchAssociatedTags();
                        onTagsChange(); // Call this after tag deletion
                    } catch (error) {
                        console.error('Failed to delete tag:', error);  
                        Alert.alert('Error', 'Failed to delete tag.');
                    }
                }}
            ]
        );
    }, [fetchAssociatedTags, onTagsChange, tags]);

    const handleCreateTag = async () => {
        if (!newTagName.trim()) {
            Alert.alert('Error', 'Tag name cannot be empty.');
            return;
        }
        try {
            await insertTag({ name: newTagName, color: newTagColor });
            setTags(await getTags());
        } catch (error) {
            console.error('Failed to create tag:', error);
            Alert.alert('Error', 'Failed to create tag.');
        }
    };

    const toggleColorPickerModal = () => {
        setIsColorPickerModalVisible(!isColorPickerModalVisible);
    };

    const renderTags = () => {
        return tags.map((tag, index) => (
            <View key={index} style={styles.tagContainer}>
                <View style={styles.tagRow}>
                    <Checkbox
                        value={associatedTags.some(associatedTag => associatedTag.tag_id === tag.id)}
                        onValueChange={() => handleTagToggle(tag.id)}
                        style={styles.checkboxStyle}
                    />
                    <TouchableOpacity
                        style={{ ...styles.tagButton, backgroundColor: tag.color }}
                        onPress={() => handleTagToggle(tag.id)}
                    >
                        <Text style={styles.tagText} numberOfLines={1} ellipsizeMode="tail">
                            {tag.name}
                        </Text>
                    </TouchableOpacity>
                </View>
                <View style={styles.tagActions}>
                    <TouchableOpacity style={styles.editButton} onPress={() => handleEditTag(tag.id)}>
                        <Icon name="edit" size={16} color="white" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.deleteButton} onPress={() => handleDeleteTag(tag.id, tag.name)}>
                        <Icon name="trash" size={16} color="white" />
                    </TouchableOpacity>
                </View>
            </View>
        ));
    };

    return (
        <Modal
            isVisible={isRatingModalVisible}
            onBackdropPress={closeModal}
            onBackButtonPress={closeModal}
            style={styles.modalStyle}
            useNativeDriverForBackdrop
            hideModalContentWhileAnimating
            animationInTiming={100}
            animationOutTiming={100}
        >
            <View style={styles.modalContainer}>
                <View style={styles.tagsContent}>
                    <Text style={styles.title}>{selectedSong.title} - {selectedSong.artist}</Text>
                    <Text style={styles.subtitle}>Tags</Text>
                    <ScrollView showsVerticalScrollIndicator={false}>
                        {renderTags()}
                    </ScrollView>
                </View>
                <Rating
                    ratingCount={10}
                    imageSize={30}
                    jumpValue={0.5}
                    fractions={1}
                    tintColor={globalStyles.modalBackgroundColor}
                    startingValue={rating}
                    showRating
                    onFinishRating={setRating}
                />
                <TouchableOpacity onPress={handleRatingSubmit} style={styles.submitButton}>
                    <Text style={styles.submitText}>Save Rating</Text>
                </TouchableOpacity>
                <ColorPickerComponent
                    isVisible={isColorPickerModalVisible}
                    toggleModal={toggleColorPickerModal}
                    selectedColor={newTagColor}
                    setSelectedColor={setNewTagColor}
                />
                <EditTagModal
                    isEditModalVisible={isEditModalVisible}
                    setIsEditModalVisible={setIsEditModalVisible}
                    tagToEdit={tagToEdit}
                    updateTagList={fetchTags}
                />
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalStyle: {
        margin: 0,
        width: '100%',
        alignItems: 'center',
    },
    modalContainer: {
        backgroundColor: globalStyles.modalBackgroundColor,
        borderRadius: 10,
        padding: 16,
        paddingVertical: 0,
        width: '95%',
        maxHeight: '100%',
    },
    submitButton: {
        backgroundColor: globalStyles.defaultButtonColor,
        borderRadius: 8,
        padding: 10,
        marginTop: 20,
        marginBottom: 10,
        justifyContent: 'center',
    },
    submitText: {
        color: 'white',
        textAlign: 'center',
    },
    tagsContent: {
        backgroundColor: globalStyles.modalBackgroundColor,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 4,
        maxHeight: '70%',
        marginVertical: 20,
    },
    title: {
        fontSize: 20,
        marginBottom: 12,
        color: 'white',
        fontWeight: 'bold',
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 20,
        marginBottom: 0,
        color: 'white',
    },
    checkboxStyle: {
        borderRadius: 5,
        marginTop: 10,
    },
    tagButton: {
        color: 'white',
        marginHorizontal: 10,
        marginTop: 10,
        padding: 5,
        borderRadius: 20,
        justifyContent: 'center',
        flex: 1,
    },
    tagText: {
        color: 'white',
        textAlign: 'center',
    },
    tagContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
    },
    tagRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    tagActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    editButton: {
        padding: 5,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'cornflowerblue',
        borderRadius: 15,
        marginTop: 10,
    },
    deleteButton: {
        padding: 5,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'crimson',
        borderRadius: 15,
        marginTop: 10,
        marginLeft: 10,
    },
});

export default RatingModal;