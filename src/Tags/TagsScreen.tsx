import React, { useState } from 'react';
import { View, Text, TextInput, KeyboardAvoidingView, Platform, TouchableOpacity, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { TouchableOpacity as RNGHTouchableOpacity } from 'react-native-gesture-handler';
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';
import ColorPicker, { Panel3, Preview, BrightnessSlider } from 'reanimated-color-picker';
import { theme } from '../styles/theme';
import { TagTidalConfigModal } from './TagTidalConfigModal';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NeonButton } from '../components/NeonButton';
import { Ionicons } from '@expo/vector-icons';
import { tagsScreenStyles as styles } from './styles/TagsScreen.styles';
import { Tag } from '../types';
import { useTagStore } from '../store/tagStore';

function TagRow({
  tag,
  onEdit,
  onDelete,
  onConfig,
  drag,
  isActive,
}: {
  tag: Tag;
  onEdit: (tag: Tag) => void;
  onDelete: (tag: Tag) => void;
  onConfig: (tag: Tag) => void;
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
        <TouchableOpacity onPress={() => onEdit(tag)} style={styles.actionButton}>
          <Ionicons name="pencil" size={16} color={theme.colors.text.blue} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onConfig(tag)} style={styles.actionButton}>
          <Ionicons name="settings-outline" size={16} color={tag.tidalPlaylistId ? theme.colors.text.success : theme.colors.text.muted} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onDelete(tag)} style={styles.actionButton}>
          <Ionicons name="trash" size={16} color={theme.colors.text.error} />
        </TouchableOpacity>
      </View>
    </ScaleDecorator>
  );
}

export default function TagsScreen() {
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
  const [configTag, setConfigTag] = useState<Tag | null>(null);

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

  const handleDeleteTag = (tag: Tag) => {
    Alert.alert(
      'Delete Tag',
      `Are you sure you want to delete "${tag.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => {
          await deleteTag(tag.id);
          refresh();
        }},
      ]
    );
  };

  const handleSaveTidalPlaylist = async (playlistId: string) => {
    if (!configTag) return;
    await updateTag(configTag.id, { tidalPlaylistId: playlistId });
    setConfigTag(null);
    refresh();
  };

  const handleRemoveTidalPlaylist = async () => {
    if (!configTag) return;
    await updateTag(configTag.id, { tidalPlaylistId: undefined });
    setConfigTag(null);
    refresh();
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.titleRow}>
          <View style={{ flex: 1 }} />
          <Text style={{ ...theme.styles.title, textAlign: 'center' }}>Tags</Text>
          <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'flex-end' }}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={openCreate}
              accessibilityLabel="Add Tag"
            >
              <Ionicons name="add" size={18} color={theme.colors.text.blue} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, { opacity: loading ? 0.2 : 0.6 }]}
              onPress={refresh}
              disabled={loading}
              accessibilityLabel="Refresh Tags"
            >
              <Ionicons name="refresh" size={18} color={theme.colors.text.blue} />
            </TouchableOpacity>
          </View>
        </View>

        <TagTidalConfigModal
          visible={configTag !== null}
          tagName={configTag?.name ?? ''}
          currentPlaylistId={configTag?.tidalPlaylistId ?? ''}
          onSave={handleSaveTidalPlaylist}
          onRemove={handleRemoveTidalPlaylist}
          onCancel={() => setConfigTag(null)}
        />

        {inputVisible ? (
          <View style={styles.inputSection}>
            <TextInput
              placeholder={editingTag ? 'Edit Tag Name' : 'Tag Name'}
              placeholderTextColor={theme.colors.text.placeholder}
              value={inputName}
              onChangeText={setInputName}
              style={styles.input}
            />
            <ColorPicker
              style={{ width: '100%', gap: 12, marginTop: 12, flex: 1 }}
              value={inputColor}
              onChangeJS={color => setInputColor(color.hex)}
            >
              <Preview style={styles.preview} />
              <Panel3 style={styles.panel} />
              <BrightnessSlider reverse={true} style={styles.slider} />
            </ColorPicker>
          </View>
        ) : loading ? (
          <ActivityIndicator size="large" color={theme.colors.text.primary} style={{ marginTop: 32 }} />
        ) : tags.length === 0 ? (
          <View style={{ alignItems: 'center', marginTop: 48, paddingHorizontal: 16 }}>
            <Text style={{ color: theme.colors.text.primary, marginBottom: 12 }}>
              No tags found.
            </Text>
          </View>
        ) : (
          <DraggableFlatList
            data={[...tags].sort((a, b) => a.position - b.position)}
            keyExtractor={tag => tag.id}
            onDragEnd={({ data }) => reorderTags(data)}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
            renderItem={({ item, drag, isActive }) => (
              <TagRow
                tag={item}
                onEdit={openEdit}
                onDelete={handleDeleteTag}
                onConfig={(tag) => setConfigTag(tag)}
                drag={drag}
                isActive={isActive}
              />
            )}
          />
        )}

        {inputVisible && (
          <View style={styles.bottomBar}>
            <View style={styles.bottomActions}>
              <NeonButton
                text="Cancel"
                onPress={handleCancel}
                color="#FF453A"
                icon="close"
                fullWidth={false}
                compact
              />
              <View style={{ flex: 1 }} />
              <NeonButton
                text={editingTag ? 'Save' : 'Add'}
                onPress={handleSave}
                color="#4CD964"
                icon={editingTag ? 'checkmark' : 'add'}
                disabled={!inputName.trim()}
                fullWidth={false}
                compact
              />
            </View>
          </View>
        )}
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}
