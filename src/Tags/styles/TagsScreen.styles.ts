// src/styles/screens/TagsScreen.styles.ts
// Styles for the Tags Screen
import { StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';

export const tagsScreenStyles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background.amoled,
        padding: 16,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    input: {
        flex: 2,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: 8,
        padding: 8,
        color: theme.colors.text.primary,
        backgroundColor: theme.colors.background.surface,
        marginRight: 8,
    },
    colorButton: {
        flex: 1,
        borderRadius: 8,
        padding: 8,
        alignItems: 'center',
        marginRight: 8,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    colorButtonText: {
        color: theme.colors.text.primary,
        fontWeight: 'bold',
    },
    saveButton: {
        flex: 1,
        backgroundColor: theme.colors.button.success,
        borderRadius: 8,
        padding: 8,
        alignItems: 'center',
        marginRight: 8,
    },
    saveButtonText: {
        color: theme.colors.text.primary,
        fontWeight: 'bold',
    },
    cancelButton: {
        flex: 1,
        backgroundColor: theme.colors.button.cancel,
        borderRadius: 8,
        padding: 8,
        alignItems: 'center',
    },
    cancelButtonText: {
        color: theme.colors.text.primary,
        fontWeight: 'bold',
    },
    addButton: {
        backgroundColor: theme.colors.button.primary,
        borderRadius: 8,
        padding: 6,
        alignItems: 'center',
        marginBottom: 20,
    },
    addButtonText: {
        color: theme.colors.text.primary,
        fontWeight: 'bold',
        fontSize: 16,
    },
    tagRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    tagColor: {
        width: 24,
        height: 24,
        borderRadius: 12,
        marginRight: 12,
    },
    tagName: {
        flex: 1,
        color: theme.colors.text.primary,
        fontSize: 16,
        borderRadius: 16,
        padding: 2,
        textAlign: 'center',
    },
    editButton: {
        marginHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
    },
    editText: {
        color: theme.colors.text.blue,
        marginLeft: 4,
    },
    deleteButton: {
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
    },
    deleteText: {
        color: theme.colors.text.error,
        marginLeft: 4,
    },
    icon: {
        marginRight: 0,
    },
    moveUpButton: {
        marginRight: 8,
        padding: 4,
        borderRadius: 12,
        backgroundColor: theme.colors.background.surface,
    },
});