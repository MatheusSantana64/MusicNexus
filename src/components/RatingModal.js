// The RatingModal component is a reusable modal component that allows users to rate a song.
// It displays a modal with a star rating component and a submit button.

import React, { useState } from 'react';
import { View, TouchableOpacity, Text, TouchableWithoutFeedback, StyleSheet } from 'react-native';
import { Rating } from 'react-native-ratings'; // https://www.npmjs.com/package/react-native-ratings
import Modal from 'react-native-modal'; // https://www.npmjs.com/package/react-native-modal

import { useEffect } from 'react';
import { ScrollView, Alert, TextInput } from 'react-native';
import { insertTag, addTag, getTags, getTagsFromSongTags, getTagById, removeTag, deleteTag } from '../database/databaseOperations';
import Checkbox from 'expo-checkbox';
import ColorPickerComponent from './ColorPicker';
import Icon from 'react-native-vector-icons/Feather';
import EditTagModal from './EditTagModal';
import { globalStyles } from '../styles/global';

const RatingModal = ({ 
    isRatingModalVisible, 
    closeModal, 
    handleRatingSelect, 
    selectedSong, 
    songs, 
    setSongs 
}) => {
// RATING
    // State to hold the rating value
    const [rating, setRating] = useState(0);

    // Function to handle the submission of the rating
    const handleRatingSubmit = () => {
        console.log(`Rating submitted for song: ${selectedSong.title} by ${selectedSong.artist}, Old Rating: ${selectedSong.rating}, New Rating: ${rating}`);
        // Check if new rating is different from old rating
        if (rating === selectedSong.rating) {
            closeModal();
            return;
        }
        const updatedSongs = songs.map(song => song.id === selectedSong.id ? { ...song, rating } : song);
        setSongs(updatedSongs);
        handleRatingSelect(rating);
    };

// TAGS
    const [tags, setTags] = useState([]);
    const [associatedTags, setAssociatedTags] = useState([]);

    const [newTagName, setNewTagName] = useState('');
    const [newTagColor, setNewTagColor] = useState(globalStyles.defaultTagColor); // Default to black
    const [isColorPickerModalVisible, setIsColorPickerModalVisible] = useState(false);

    const [isEditModalVisible, setIsEditModalVisible] = useState(false);
    const [tagToEdit, setTagToEdit] = useState(null);

    // Call getTags when the component mounts
    useEffect(() => {
        if (isRatingModalVisible) {
            fetchTags();
            fetchAssociatedTags();
        }
    }, [isRatingModalVisible]);

    const fetchTags = async () => {
        try {
            const fetchedTags = await getTags();
            setTags(fetchedTags);
        } catch (error) {
            console.error('Failed to fetch tags:', error);
            Alert.alert('Error', 'Failed to fetch tags.');
        }
    };

    const fetchAssociatedTags = async () => {
        try {
            const fetchedAssociatedTags = await getTagsFromSongTags(selectedSong.id);
            setAssociatedTags(fetchedAssociatedTags);
        } catch (error) {
            console.error('Failed to fetch associated tags:', error);
            Alert.alert('Error', 'Failed to fetch associated tags.');
        }
    };

    const renderTags = () => {
        return tags.map((tag, index) => (
            <View key={index} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <Checkbox
                        value={associatedTags.some(associatedTag => associatedTag.tag_id === tag.id)}
                        onValueChange={() => handleTagToggle(tag.id)}
                        style={styles.checkboxStyle}
                    />
                    <TouchableOpacity
                        style={{ ...styles.tagButton, backgroundColor: tag.color, flex: 1 }}
                        onPress={() => handleTagToggle(tag.id)}
                    >
                        <View style={{ flex: 1 }}>
                            <Text style={styles.tagText} numberOfLines={1} ellipsizeMode="tail">
                                {tag.name}
                            </Text>
                        </View>
                    </TouchableOpacity>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <TouchableOpacity
                        style={styles.editButton}
                        onPress={() => handleEditTag(tag.id)}
                    >
                        <Icon name="edit" size={16} color="white" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.deleteButton, { marginLeft: 10 }]}
                        onPress={() => handleDeleteTag(tag.id, tag.name)}
                    >
                        <Icon name="trash" size={16} color="white" />
                    </TouchableOpacity>
                </View>
            </View>
        ));
    };    

    const handleTagToggle = async (tagId) => {
        console.log('Toggling tag: ', tagId, ' for song: ', selectedSong.id);
        if (associatedTags.some(associatedTag => associatedTag.tag_id === tagId)) {
            // Remove the tag from the selected song
            await removeTag(selectedSong.id, tagId);
            console.log('Removed tag:', tagId);
        } else {
            // Add the tag to the selected song
            await addTag(selectedSong.id, tagId);
            console.log('Added tag:', tagId);
        }
        await fetchAssociatedTags();
    };

    const handleEditTag = async (tagId) => {
        const editedTag = await getTagById(tagId);
        
        if (!editedTag) {
            Alert.alert('Error', 'Tag not found');
            return;
        }

        setTagToEdit(editedTag);
        setIsEditModalVisible(true);
    };

    const handleDeleteTag = async (tagId, tagName) => {
        console.log('Deleting tag: ', tagId);

        // Show a confirmation dialog
        Alert.alert(
            `Delete Tag "${tagName}"?`,
            `Are you sure you want to delete this tag? It will be removed from all songs that use it.`,
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'OK', onPress: async () => {
                    try {
                        await deleteTag(tagId);

                        // Find the index of the deleted tag in the tags array
                        const updatedTags = tags.filter(tag => tag.id !== tagId);

                        // Update the tags state
                        setTags(updatedTags);

                        // Fetch associated tags again
                        await fetchAssociatedTags();
                    
                        console.log('Tag deleted successfully');
                    } catch (error) {
                        console.error('Failed to delete tag:', error);
                        Alert.alert('Error', 'Failed to delete tag.');
                    }
                }}
            ]
        );
    };

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

    return (
        <Modal
            isVisible={isRatingModalVisible}
            onBackdropPress={closeModal}
            onBackButtonPress={closeModal}
            style={styles.modalStyle}
            useNativeDriverForBackdrop={true}
            hideModalContentWhileAnimating={true}
            animationInTiming={100}
            animationOutTiming={100}
            children={
                <View style={styles.modalContainer}>
                    <View style={styles.tagsContent}>
                        <Text style={{...styles.title, fontWeight: 'bold', textAlign: 'center'}}>{selectedSong.title} - {selectedSong.artist}</Text>
                        <Text style={{ color: 'white', fontSize: 16 }}>Create New Tag:</Text>
                        <View style={styles.inputContainer}>
                            <TextInput
                                style={styles.inputText}
                                value={newTagName}
                                onChangeText={(text) => setNewTagName(text)}
                                placeholder="New Tag Name"
                                placeholderTextColor="white"
                            />
                            <TouchableOpacity style={{ ...styles.colorButton, backgroundColor: newTagColor }} onPress={toggleColorPickerModal}>
                                <Text style={{ color: 'white' }}>Tag Color</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.addButton}
                                onPress={handleCreateTag}
                            >
                                <Text style={styles.addButtonText}>Add Tag</Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={{...styles.title, marginTop: 30}}>Selected Tags</Text>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            {renderTags()}
                        </ScrollView>
                    </View>

                    <Rating
                        fractions={1}
                        ratingCount={10}
                        jumpValue={0.5}
                        imageSize={30}
                        tintColor={globalStyles.modalBackgroundColor}
                        startingValue={selectedSong.rating}
                        showRating
                        onFinishRating={(rating) => setRating(rating)}
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
            }
        > 
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
        alignItems: 'stretch', // 'stretch' is necessary for stars to look fine for some reason
        maxHeight: '90%',
    },

    submitButton: {
        backgroundColor: globalStyles.defaultButtonColor,
        borderRadius: 8,
        padding: 10,
        marginTop: 16,
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
    },
    tagText: {
        color: 'white',
        textAlign: 'center',
    },
    inputContainer: {
        color: 'white',
        flexDirection: 'row',
        marginTop: 20,
    },
    inputText: {
        color: 'white',
        height: 40,
        borderColor: 'gray',
        borderWidth: 1,
        borderRadius: 5,
        width: '45%',
        marginRight: 10,
        paddingLeft: 10,
    },
    colorButton: {
        color: 'white',
        padding: 10,
        borderRadius: 5,
        alignSelf: 'center',
        marginRight: 10,
    },
    addButton: {
        color: 'white',
        backgroundColor: 'darkgreen',
        padding: 10,
        borderRadius: 5,
    },
    addButtonText: {
        color: 'white',
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
    },
});

export default RatingModal;