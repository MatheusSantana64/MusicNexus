import React, { useState } from 'react';
import { View, Text, TextInput, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { theme } from '../styles/theme';
import { TagColorPicker } from '../components/TagColorPicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { tagsScreenStyles as styles } from '../styles/screens/TagsScreen.styles';

interface Tag {
  id: string;
  name: string;
  color: string;
}

function TagRow({ tag, onEdit, onDelete }: { tag: Tag; onEdit: (tag: Tag) => void; onDelete: (id: string) => void }) {
  return (
    <View style={styles.tagRow}>
      <Text style={[styles.tagName, { backgroundColor: tag.color }]}>{tag.name}</Text>
      <TouchableOpacity onPress={() => onEdit(tag)} style={styles.editButton}>
        <Ionicons name="pencil" size={16} color={theme.colors.text.blue} style={styles.icon} />
        <Text style={styles.editText}>Edit</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => onDelete(tag.id)} style={styles.deleteButton}>
        <Ionicons name="trash" size={16} color={theme.colors.text.error} style={styles.icon} />
        <Text style={styles.deleteText}>Delete</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function TagsScreen() {
  const [tags, setTags] = useState<Tag[]>([
    { id: '1', name: 'Favorite', color: '#FFD700' },
    { id: '2', name: 'Relax', color: '#32D74B' },
  ]);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [inputName, setInputName] = useState('');
  const [inputColor, setInputColor] = useState('#002a55');
  const [inputVisible, setInputVisible] = useState(false);
  const [colorPickerVisible, setColorPickerVisible] = useState(false);

  // Open create or edit
  const openCreate = () => {
    setEditingTag(null);
    setInputName('');
    setInputColor('#002a55');
    setInputVisible(true);
  };
  const openEdit = (tag: Tag) => {
    setEditingTag(tag);
    setInputName(tag.name);
    setInputColor(tag.color);
    setInputVisible(true);
  };

  // Save create or edit
  const handleSave = () => {
    if (!inputName.trim()) return;
    if (editingTag) {
      setTags(tags.map(tag =>
        tag.id === editingTag.id ? { ...tag, name: inputName, color: inputColor } : tag
      ));
    } else {
      setTags([...tags, { id: Date.now().toString(), name: inputName, color: inputColor }]);
    }
    setInputVisible(false);
    setEditingTag(null);
    setInputName('');
    setInputColor('#002a55');
  };

  const handleCancel = () => {
    setInputVisible(false);
    setEditingTag(null);
    setInputName('');
    setInputColor('#002a55');
  };

  const handleDeleteTag = (id: string) => {
    setTags(tags.filter(tag => tag.id !== id));
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
        <SafeAreaView style={styles.container} edges={['top']}>

        {/* Tag creation/edit row */}
        {inputVisible ? (
          <View style={styles.inputRow}>
            <TextInput
              placeholder={editingTag ? "Edit Tag Name" : "Tag Name"}
              placeholderTextColor={theme.colors.text.placeholder}
              value={inputName}
              onChangeText={setInputName}
              style={styles.input}
            />
            <TouchableOpacity
              onPress={() => setColorPickerVisible(true)}
              style={[styles.colorButton, { backgroundColor: inputColor }]}
            >
              <Text style={styles.colorButtonText}>Color</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSave}
              style={[styles.saveButton, { flex: 0.5, marginRight: 4 }]}
              disabled={!inputName.trim()}
              accessibilityLabel={editingTag ? "Save" : "Create"}
            >
              <Ionicons
                name={editingTag ? "checkmark" : "add"}
                size={22}
                color={theme.colors.text.primary}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleCancel}
              style={[styles.cancelButton, { flex: 0.5 }]}
              accessibilityLabel="Cancel"
            >
              <Ionicons
                name="close"
                size={22}
                color={theme.colors.text.primary}
              />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.addButton} onPress={openCreate}>
            <Text style={styles.addButtonText}>+ Add Tag</Text>
          </TouchableOpacity>
        )}

        {/* Color Picker Modal */}
        <TagColorPicker
          visible={colorPickerVisible}
          value={inputColor}
          onChange={setInputColor}
          onClose={() => setColorPickerVisible(false)}
        />

        {/* Tag list */}
        <FlashList
          data={tags}
          keyExtractor={tag => tag.id}
          estimatedItemSize={48}
          contentContainerStyle={{ paddingBottom: 24 }}
          renderItem={({ item }) => (
            <TagRow tag={item} onEdit={openEdit} onDelete={handleDeleteTag} />
          )}
        />
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}