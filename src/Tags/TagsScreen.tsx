// src/Tags/TagsScreen.tsx
// TagsScreen component for managing music tags
import React, { useState } from 'react';
import { View, Text, TextInput, KeyboardAvoidingView, Platform, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { theme } from '../styles/theme';
import { TagColorPicker } from './TagColorPicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { tagsScreenStyles as styles } from './styles/TagsScreen.styles';
import { Tag } from '../types';
import { useTagStore } from '../store/tagStore';

function TagRow({
  tag,
  onEdit,
  onDelete,
  onMoveUp,
}: {
  tag: Tag;
  onEdit: (tag: Tag) => void;
  onDelete: (id: string) => void;
  onMoveUp: (id: string) => void;
}) {
  return (
    <View style={styles.tagRow}>
      <TouchableOpacity
        onPress={() => onMoveUp(tag.id)}
        style={styles.moveUpButton}
        accessibilityLabel="Move Up"
        disabled={tag.position === 1}
      >
        <Ionicons
          name="arrow-up"
          size={18}
          color={tag.position === 1 ? theme.colors.text.placeholder : theme.colors.text.primary}
        />
      </TouchableOpacity>
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
  // Use Zustand store for tags
  const {
    tags,
    loading,
    error,
    addTag,
    updateTag,
    deleteTag,
    refresh,
  } = useTagStore();

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
  const handleSave = async () => {
    if (!inputName.trim()) return;
    setInputVisible(false);
    setEditingTag(null);
    setInputName('');
    setInputColor('#002a55');
    if (editingTag) {
      await updateTag(editingTag.id, { name: inputName, color: inputColor });
    } else {
      await addTag({
        name: inputName,
        color: inputColor,
        position: tags.length + 1,
      });
    }
    refresh();
  };

  const handleCancel = () => {
    setInputVisible(false);
    setEditingTag(null);
    setInputName('');
    setInputColor('#002a55');
  };

  const handleDeleteTag = async (id: string) => {
    await deleteTag(id);
    refresh();
  };

  // Move tag up by 1 position
  const handleMoveUp = async (id: string) => {
    // Always work with tags sorted by position
    const sortedTags = [...tags].sort((a, b) => a.position - b.position);
    const idx = sortedTags.findIndex(tag => tag.id === id);
    if (idx > 0) {
      const tagAbove = sortedTags[idx - 1];
      const tagCurrent = sortedTags[idx];
      // Swap their positions
      await Promise.all([
        updateTag(tagCurrent.id, { position: tagAbove.position }),
        updateTag(tagAbove.id, { position: tagCurrent.position }),
      ]);
      refresh();
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <SafeAreaView style={styles.container} edges={['top']}>

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

        <TagColorPicker
          visible={colorPickerVisible}
          value={inputColor}
          onChange={setInputColor}
          onClose={() => setColorPickerVisible(false)}
        />

        {loading ? (
          <ActivityIndicator size="large" color={theme.colors.text.primary} style={{ marginTop: 32 }} />
        ) : tags.length === 0 ? (
          <View style={{ alignItems: 'center', marginTop: 48 }}>
            <Text style={{ color: theme.colors.text.primary, marginBottom: 12 }}>
              No tags found.
            </Text>
          </View>
        ) : (
          <FlashList
            data={[...tags].sort((a, b) => a.position - b.position)}
            keyExtractor={tag => tag.id}
            estimatedItemSize={48}
            contentContainerStyle={{ paddingBottom: 24 }}
            renderItem={({ item }) => (
              <TagRow
                tag={item}
                onEdit={openEdit}
                onDelete={handleDeleteTag}
                onMoveUp={handleMoveUp}
              />
            )}
          />
        )}

        {/* Refresh Button at the bottom */}
        <View style={{ alignItems: 'flex-end' }}>
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'flex-end',
              backgroundColor: theme.colors.button.primary,
              padding: 6,
              borderRadius: 8,
              opacity: loading ? 0.2 : 0.6,
            }}
            onPress={refresh}
            disabled={loading}
            accessibilityLabel="Refresh Tags"
          >
            <Ionicons name="refresh" size={20} color={theme.colors.text.primary} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}