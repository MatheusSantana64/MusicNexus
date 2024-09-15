import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, TextInput } from 'react-native';
import Modal from 'react-native-modal';
import { insertTag, addTag, getTags, getTagsFromSongTags, getTagById, removeTag, deleteTag } from '../database/databaseOperations';
import Checkbox from 'expo-checkbox';
import ColorPickerComponent from './ColorPicker';
import Icon from 'react-native-vector-icons/Feather';
import EditTagModal from './EditTagModal';

const TagsModal = ({ isTagsModalVisible, closeModals, selectedSong }) => {
    const [tags, setTags] = useState([]);
    const [associatedTags, setAssociatedTags] = useState([]);
    
    const [newTagName, setNewTagName] = useState('');
    const [newTagColor, setNewTagColor] = useState('#000000'); // Default to black
    const [isColorPickerModalVisible, setIsColorPickerModalVisible] = useState(false);
    
    const [isEditModalVisible, setIsEditModalVisible] = useState(false);
    const [tagToEdit, setTagToEdit] = useState(null);

    // Call getTags when the component mounts
    useEffect(() => {
        if (isTagsModalVisible) {
            fetchTags();
            fetchAssociatedTags();
        }
    }, [isTagsModalVisible]);

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
                        style={{ marginTop: 10 }}
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
        <View style={styles.container}>
            <Modal
                isVisible={isTagsModalVisible}
                onBackdropPress={closeModals}
                onBackButtonPress={closeModals}
                useNativeDriverForBackdrop={true}
                hideModalContentWhileAnimating={true}
                animationInTiming={100}
                animationOutTiming={100}
                onRequestClose={closeModals}
            >
                <View style={styles.modalContent}>
                    <Text style={styles.title}>Selected Tags</Text>
                    <ScrollView showsVerticalScrollIndicator={false}>
                        {renderTags()}
                    </ScrollView>
                    <Text style={{ color: 'white', fontSize: 18, marginTop: 30 }}>Create New Tag:</Text>
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
                </View>
            </Modal>

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
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        height: '20%',
    },
    modalContent: {
        backgroundColor: '#1e272e',
        padding: 22,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 4,
        maxHeight: '100%',
    },
    title: {
        fontSize: 20,
        marginBottom: 12,
        color: 'white',
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
    },
    editButtonText: {
        color: 'white',
        fontWeight: 'bold',
    },
    deleteButton: {
        padding: 5,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'crimson',
        borderRadius: 15,
    },
    deleteButtonText: {
        color: 'white',
        fontWeight: 'bold',
    },
});

export default TagsModal;