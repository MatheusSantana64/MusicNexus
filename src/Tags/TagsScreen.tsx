// src/Tags/TagsScreen.tsx
// TagsScreen component for managing music tags
import React, { useState } from 'react';
import { View, Text, TextInput, KeyboardAvoidingView, Platform, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { TouchableOpacity as RNGHTouchableOpacity } from 'react-native-gesture-handler';
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';
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
  drag,
  isActive,
}: {
  tag: Tag;
  onEdit: (tag: Tag) => void;
  onDelete: (id: string) => void;
  drag: () => void;
  isActive: boolean;
}) {
  return (
    <ScaleDecorator>
      <View style={[styles.tagRow, isActive && { opacity: 0.8 }]}>
        <RNGHTouchableOpacity
          onPressIn={drag}
          style={styles.dragHandle}
          accessibilityLabel="Drag to reorder"
        >
          <Ionicons name="reorder-three" size={20} color={isActive ? theme.colors.text.primary : theme.colors.text.placeholder} />
        </RNGHTouchableOpacity>
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
    </ScaleDecorator>
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
    reorderTags,
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
          <DraggableFlatList
            data={[...tags].sort((a, b) => a.position - b.position)}
            keyExtractor={tag => tag.id}
            onDragEnd={({ data }) => reorderTags(data)}
            contentContainerStyle={{ paddingBottom: 24 }}
            renderItem={({ item, drag, isActive }) => (
              <TagRow
                tag={item}
                onEdit={openEdit}
                onDelete={handleDeleteTag}
                drag={drag}
                isActive={isActive}
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