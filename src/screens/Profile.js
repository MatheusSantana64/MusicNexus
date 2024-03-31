import React from 'react';
import { View, Button, Alert } from 'react-native';
import * as FileSystem from 'expo-file-system';

export function Profile() {
    // Function to handle the deletion of the database
    const handleDeleteDatabase = async () => {
        try {
            // Construct the file path
            const filePath = FileSystem.documentDirectory + 'musicnexus_data.json';

            // Check if the file exists
            const fileInfo = await FileSystem.getInfoAsync(filePath);
            if (fileInfo.exists) {
                // Delete the file
                await FileSystem.deleteAsync(filePath);
                Alert.alert("Success", "Database deleted successfully.");
            } else {
                Alert.alert("Error", "Database file does not exist.");
            }
        } catch (error) {
            Alert.alert("Error", "Failed to delete the database.");
        }
    };

    return (
        <View
            style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'flex-end',
                paddingBottom: 64,
                backgroundColor: '#090909',
                padding: 16,
            }}
        >
            <Button
                title="Delete Database"
                onPress={handleDeleteDatabase}
                color="#FF0000"
            />
        </View>
    );
}