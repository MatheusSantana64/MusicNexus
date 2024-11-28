import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, TextInput } from 'react-native';
import Modal from 'react-native-modal';
import { insertTag, addTag, getTags, getTagsFromSongTags, getTagById, removeTag, deleteTag } from '../database/databaseOperations';
import Checkbox from 'expo-checkbox';
import ColorPickerComponent from './ColorPicker';
import Icon from 'react-native-vector-icons/Feather';
import EditTagModal from './EditTagModal';
import { globalStyles } from '../styles/global';

const TagsModal = ({ isTagsModalVisible, closeModals, selectedSong }) => {
    const [tags, setTags] = useState([]);
    const [associatedTags, setAssociatedTags] = useState([]);
    const [newTagName, setNewTagName] = useState('');
    const [newTagColor, setNewTagColor] = useState(globalStyles.defaultTagColor);
    const [isColorPickerModalVisible, setIsColorPickerModalVisible] = useState(false);
    const [isEditModalVisible, setIsEditModalVisible] = useState(false);
    const [tagToEdit, setTagToEdit] = useState(null);

    useEffect(() => {
        if (isTagsModalVisible) {
            fetchTags();
            fetchAssociatedTags();
        }
    }, [isTagsModalVisible]);

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

    const handleTagToggle = useCallback(async (tagId) => {
        if (associatedTags.some(associatedTag => associatedTag.tag_id === tagId)) {
            await removeTag(selectedSong.id, tagId);
        } else {
            await addTag(selectedSong.id, tagId);
        }
        await fetchAssociatedTags();
    }, [associatedTags, selectedSong.id, fetchAssociatedTags]);

    const handleEditTag = useCallback(async (tagId) => {
        const editedTag = await getTagById(tagId);
        if (!editedTag) {
            Alert.alert('Error', 'Tag not found');
            return;
        }
        setTagToEdit(editedTag);
        setIsEditModalVisible(true);
    }, []);

    const handleDeleteTag = useCallback(async (tagId, tagName) => {
        Alert.alert(
            `Delete Tag "${tagName}"?`,
            `Are you sure you want to delete this tag? It will be removed from all songs that use it.`,
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'OK', onPress: async () => {
                    try {
                        await deleteTag(tagId);
                        setTags(prevTags => prevTags.filter(tag => tag.id !== tagId));
                        await fetchAssociatedTags();
                    } catch (error) {
                        console.error('Failed to delete tag:', error);
                        Alert.alert('Error', 'Failed to delete tag.');
                    }
                }}
            ]
        );
    }, [fetchAssociatedTags]);

    const handleCreateTag = useCallback(async () => {
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
    }, [newTagName, newTagColor]);

    const toggleColorPickerModal = useCallback(() => {
        setIsColorPickerModalVisible(prevState => !prevState);
    }, []);

    const renderTags = useCallback(() => {
        return tags.map((tag, index) => (
            <View key={index} style={styles.tagContainer}>
                <View style={styles.tagRow}>
                    <Checkbox
                        value={associatedTags.some(associatedTag => associatedTag.tag_id === tag.id)}
                        onValueChange={() => handleTagToggle(tag.id)}
                        style={styles.checkbox}
                    />
                    <TouchableOpacity
                        style={[styles.tagButton, { backgroundColor: tag.color }]}
                        onPress={() => handleTagToggle(tag.id)}
                    >
                        <Text style={styles.tagText} numberOfLines={1} ellipsizeMode="tail">
                            {tag.name}
                        </Text>
                    </TouchableOpacity>
                </View>
                <View style={styles.actionButtons}>
                    <TouchableOpacity style={styles.editButton} onPress={() => handleEditTag(tag.id)}>
                        <Icon name="edit" size={16} color="white" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.deleteButton} onPress={() => handleDeleteTag(tag.id, tag.name)}>
                        <Icon name="trash" size={16} color="white" />
                    </TouchableOpacity>
                </View>
            </View>
        ));
    }, [tags, associatedTags, handleTagToggle, handleEditTag, handleDeleteTag]);

    return (
        <View style={styles.container}>
            <Modal
                isVisible={isTagsModalVisible}
                onBackdropPress={closeModals}
                onBackButtonPress={closeModals}
                useNativeDriverForBackdrop
                hideModalContentWhileAnimating
                animationInTiming={100}
                animationOutTiming={100}
                onRequestClose={closeModals}
            >
                <View style={styles.modalContent}>
                    <Text style={styles.title}>Selected Tags</Text>
                    <ScrollView showsVerticalScrollIndicator={false}>
                        {renderTags()}
                    </ScrollView>
                    <Text style={styles.createTagText}>Create New Tag:</Text>
                    <View style={styles.inputContainer}>
                        <TextInput
                            style={styles.inputText}
                            value={newTagName}
                            onChangeText={setNewTagName}
                            placeholder="New Tag Name"
                            placeholderTextColor="white"
                        />
                        <TouchableOpacity style={[styles.colorButton, { backgroundColor: newTagColor }]} onPress={toggleColorPickerModal}>
                            <Text style={styles.colorButtonText}>Tag Color</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.addButton} onPress={handleCreateTag}>
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
        backgroundColor: globalStyles.modalBackgroundColor,
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
    createTagText: {
        color: 'white',
        fontSize: 18,
        marginTop: 30,
    },
    inputContainer: {
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
        padding: 10,
        borderRadius: 5,
        alignSelf: 'center',
        marginRight: 10,
    },
    colorButtonText: {
        color: 'white',
    },
    addButton: {
        backgroundColor: 'darkgreen',
        padding: 10,
        borderRadius: 5,
    },
    addButtonText: {
        color: 'white',
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
    checkbox: {
        marginTop: 10,
    },
    tagButton: {
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
    actionButtons: {
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

export default TagsModal;