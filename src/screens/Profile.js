import React from 'react';
import { View, Button, Alert } from 'react-native';
import * as SQLite from 'expo-sqlite';

// Open or create the database
const db = SQLite.openDatabase('musicnexus.db');

export function Profile() {
    // Function to handle the deletion of all songs in the database
    const handleDeleteAllSongs = async () => {
        try {
            await new Promise((resolve, reject) => {
                db.transaction(tx => {
                    tx.executeSql(
                        'DELETE FROM songs',
                        [],
                        () => resolve(),
                        (_, error) => reject(error)
                    );
                });
            });
            Alert.alert('Success', 'All songs have been deleted.');
        } catch (error) {
            Alert.alert('Error', 'Failed to delete all songs.');
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
                title="Delete All Songs"
                onPress={handleDeleteAllSongs}
                color="#FF0000"
            />
        </View>
    );
}