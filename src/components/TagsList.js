// TagsList.js
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView, TextInput } from 'react-native';
import { deleteTag, insertTag, getTags } from '../database/databaseOperations';
import EditTagModal from './EditTagModal';
import ColorPickerComponent from './ColorPicker';
import Icon from 'react-native-vector-icons/Feather';

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
      'Are you sure you want to delete this tag?',
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
      {tags.map(tag => (
        <View key={tag.id} style={styles.tagContainer}>
          <TouchableOpacity style={[styles.tagButton, { backgroundColor: tag.color }]} onPress={() => handleEditTag(tag)}>
            <Text style={styles.tagText}>{tag.name}</Text>
          </TouchableOpacity>
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.deleteButton} onPress={() => handleDeleteTag(tag.id, tag.name)}>
              <Icon name="trash" size={16} color="white" />
            </TouchableOpacity>
          </View>
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

const styles = StyleSheet.create({
    tagContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 5,
      flex: 1,
      justifyContent: 'space-between',
    },
    tagButton: {
        marginHorizontal: 10,
        padding: 4,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        flex: 1,
        marginLeft: 'auto',
    },
    tagText: {
      color: 'white',
      fontSize: 16,
    },
    actionButtons: {
      flexDirection: 'row',
      marginLeft: 'auto',
      alignItems: 'center',
      justifyContent: 'center',
    },
    deleteButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'crimson',
      padding: 5,
      paddingHorizontal: 10,
      borderRadius: 15,
    },
    buttonText: {
        color: 'white',
    },
    createTagContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
        marginTop: 10,
    },
    input: {
        flex: 1,
        color: 'white',
        borderColor: 'gray',
        borderWidth: 1,
        borderRadius: 5,
        paddingVertical: 2,
        paddingHorizontal: 8,
        marginRight: 10,
    },
    colorButton: {
        padding: 8,
        borderRadius: 5,
        marginRight: 10,
    },
    createButton: {
        backgroundColor: 'green',
        padding: 8,
        borderRadius: 5,
    },
});

export default TagsList;