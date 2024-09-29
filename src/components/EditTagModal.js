import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { updateTag } from '../database/databaseOperations';
import Modal from 'react-native-modal';
import ColorPickerComponent from './ColorPicker';
import { globalStyles } from '../styles/global';

const EditTagModal = ({ isEditModalVisible, setIsEditModalVisible, tagToEdit, updateTagList }) => {
    const [newTagName, setNewTagName] = useState('');
    const [newTagColor, setNewTagColor] = useState(globalStyles.defaultTagColor); // Default color
    const [isColorPickerEditModalVisible, setIsColorPickerEditModalVisible] = useState(false);

    useEffect(() => {
        if (tagToEdit) {
            setNewTagName(tagToEdit.name);
            setNewTagColor(tagToEdit.color);
        }
    }, [tagToEdit]);

    const toggleColorPickerEditModal = () => {
        setIsColorPickerEditModalVisible(!isColorPickerEditModalVisible);
    };

    const handleSaveEdit = async () => {
        if (newTagName.trim() && newTagColor) {
            try {
                await updateTag(tagToEdit.id, { name: newTagName, color: newTagColor });
                updateTagList(); // Refresh the tag list after saving
                Alert.alert('Success', 'Tag updated successfully!');
                setIsEditModalVisible(false);
            } catch (error) {
                console.error('Failed to update tag:', error);
                Alert.alert('Error', 'Failed to update tag.');
            }
        } else {
            Alert.alert('Error', 'Please enter a valid tag name and color.');
        }
    };

    return (
        <View>
            <Modal
                isVisible={isEditModalVisible}
                onBackdropPress={() => setIsEditModalVisible(false)}
                onBackButtonPress={() => setIsEditModalVisible(false)}
                useNativeDriverForBackdrop={true}
                hideModalContentWhileAnimating={true}
                animationInTiming={100}
                animationOutTiming={100}
                onRequestClose={() => setIsEditModalVisible(false)}
            >
                <View style={styles.modalContent}>
                    <Text style={styles.title}>Edit Tag</Text>
                    <TextInput
                        style={styles.inputText}
                        value={newTagName}
                        onChangeText={(text) => setNewTagName(text)}
                        placeholder="New Tag Name"
                        placeholderTextColor="white"
                    />
                    <TouchableOpacity style={{ ...styles.colorButton, backgroundColor: newTagColor }} onPress={toggleColorPickerEditModal}>
                        <Text style={{ color: 'white' }}>Tag Color</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.saveButton}
                        onPress={handleSaveEdit}
                    >
                        <Text style={styles.saveButtonText}>Save Changes</Text>
                    </TouchableOpacity>
                </View>
            </Modal>

            {/* Color Picker for editing */}
            <ColorPickerComponent
                isVisible={isColorPickerEditModalVisible}
                toggleModal={toggleColorPickerEditModal}
                selectedColor={newTagColor}
                setSelectedColor={setNewTagColor}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    modalContent: {
        backgroundColor: globalStyles.modalBackgroundColor,
        padding: 22,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 4,
    },
    title: {
        fontSize: 20,
        marginBottom: 12,
        color: 'white',
    },
    inputText: {
        color: 'white',
        height: 40,
        borderColor: 'gray',
        borderWidth: 1,
        borderRadius: 5,
        width: '80%',
        marginBottom: 10,
        paddingLeft: 10,
    },
    colorButton: {
        padding: 10,
        borderRadius: 5,
        alignSelf: 'center',
        marginBottom: 10,
    },
    saveButton: {
        backgroundColor: 'darkgreen',
        padding: 10,
        borderRadius: 5,
    },
    saveButtonText: {
        color: 'white',
    },
});

export default EditTagModal;