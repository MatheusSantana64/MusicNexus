import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, ScrollView, TextInput } from 'react-native';
import { deleteTag, insertTag, moveTagUp, moveTagDown } from '../database/databaseOperations';
import EditTagModal from './EditTagModal';
import ColorPickerComponent from './ColorPicker';
import Icon from 'react-native-vector-icons/Feather';
import { tagsListStyles as styles } from '../styles/componentsStyles';

const TagsList = ({ tags, refreshTags }) => {
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [tagToEdit, setTagToEdit] = useState(null);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#141E61'); // Default color
  const [isColorPickerVisible, setIsColorPickerVisible] = useState(false);

  const handleEditTag = tag => {
    setTagToEdit(tag);
    setIsEditModalVisible(true);
  };

  const handleDeleteTag = (tagId, tagName) => {
    Alert.alert(
      `Delete Tag "${tagName}"?`,
      'Are you sure you want to delete this tag?\nThis will also remove this tag from all tagged songs.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'OK',
          onPress: async () => {
            try {
              await deleteTag(tagId);
              refreshTags();
            } catch (error) {
              console.error('Failed to delete tag:', error);
              Alert.alert('Error', 'Failed to delete tag.');
            }
          },
        },
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
      setNewTagName('');
      setNewTagColor('#141E61'); // Reset to default color
      refreshTags();
    } catch (error) {
      console.error('Failed to create tag:', error);
      Alert.alert('Error', 'Failed to create tag.');
    }
  };

  const handleMoveTagUp = async (tagId) => {
    try {
      await moveTagUp(tagId);
      refreshTags();
    } catch (error) {
      console.error('Failed to move tag up:', error);
      Alert.alert('Error', 'Failed to move tag up.');
    }
  };

  const handleMoveTagDown = async (tagId) => {
    try {
      await moveTagDown(tagId);
      refreshTags();
    } catch (error) {
      console.error('Failed to move tag down:', error);
      Alert.alert('Error', 'Failed to move tag down.');
    }
  };

  return (
    <ScrollView>
      <View style={styles.createTagContainer}>
        <TextInput
          style={styles.input}
          placeholder="New Tag Name"
          value={newTagName}
          onChangeText={setNewTagName}
          placeholderTextColor="gray"
        />
        <TouchableOpacity style={[styles.colorButton, { backgroundColor: newTagColor }]} onPress={() => setIsColorPickerVisible(true)}>
          <Text style={styles.buttonText}>Pick Color</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.createButton} onPress={handleCreateTag}>
          <Text style={styles.buttonText}>Create Tag</Text>
        </TouchableOpacity>
      </View>
      {tags.map((tag, index) => (
        <View key={tag.id} style={styles.tagContainer}>
          <TouchableOpacity style={styles.deleteButton} onPress={() => handleDeleteTag(tag.id, tag.name)}>
            <Icon name="trash" size={16} color="white" />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.tagButton, { backgroundColor: tag.color }]} onPress={() => handleEditTag(tag)}>
            <Text style={styles.tagText}>{tag.name}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.moveButton} onPress={() => handleMoveTagUp(tag.id)}>
            <Icon name="arrow-up" size={16} color="white" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.moveButton} onPress={() => handleMoveTagDown(tag.id)}>
            <Icon name="arrow-down" size={16} color="white" />
          </TouchableOpacity>
        </View>
      ))}
      {isEditModalVisible && (
        <EditTagModal
          isEditModalVisible={isEditModalVisible}
          setIsEditModalVisible={setIsEditModalVisible}
          tagToEdit={tagToEdit}
          updateTagList={refreshTags}
        />
      )}
      {isColorPickerVisible && (
        <ColorPickerComponent
          isVisible={isColorPickerVisible}
          toggleModal={() => setIsColorPickerVisible(false)}
          selectedColor={newTagColor}
          setSelectedColor={setNewTagColor}
        />
      )}
    </ScrollView>
  );
};

export default TagsList;