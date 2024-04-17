// This file contains the Profile screen, which allows the user to delete all songs in the database, check stats, and more personal information.

import React from 'react';
import { View, Button, Alert } from 'react-native';
import { initDatabase } from '../databaseSetup'; // Import the initDatabase function
import { db } from '../databaseSetup'; // Import the db variable

export function Profile() {
    // Function to handle the deletion of all songs in the database
    const handleDeleteData = async () => {
        try {
            // First confirmation
            const firstConfirmation = await new Promise((resolve, reject) => {
                Alert.alert(
                    'Delete all data?',
                    'Are you sure you want to delete all data?\nThis includes all songs and tags.',
                    [
                        { text: 'Cancel', onPress: () => reject(new Error('Cancelled')) },
                        { text: 'OK', onPress: () => resolve(true) },
                    ],
                    { cancelable: false }
                );
            });
    
            if (!firstConfirmation) {
                // If the first confirmation is cancelled, do not proceed
                return;
            }
    
            // Second confirmation
            const secondConfirmation = await new Promise((resolve, reject) => {
                Alert.alert(
                    'Delete all data?',
                    'This action cannot be undone!\nAre you sure you want to proceed?',
                    [
                        { text: 'Cancel', onPress: () => reject(new Error('Cancelled')) },
                        { text: 'OK', onPress: () => resolve(true) },
                    ],
                    { cancelable: false }
                );
            });
    
            if (!secondConfirmation) {
                // If the second confirmation is cancelled, do not proceed
                return;
            }
    
            // Proceed with data deletion
            await new Promise((resolve, reject) => {
                db.transaction(tx => {
                    // Drop songs table
                    tx.executeSql('DROP TABLE IF EXISTS songs', [], () => {
                        // Drop tags table
                        tx.executeSql('DROP TABLE IF EXISTS tags', [], () => {
                            // Drop song_tags table
                            tx.executeSql('DROP TABLE IF EXISTS song_tags', [], () => {
                                resolve();
                            }, (_, error) => reject(error));
                        }, (_, error) => reject(error));
                    }, (_, error) => reject(error));
                });
            });

            Alert.alert('Success', 'All tables have been dropped.');

            // Recreate the tables
            initDatabase();
        } 
        catch (error) {
            // Only show the error message if an actual error occurs
            if (error.message !== 'Cancelled') {
                Alert.alert('Error', 'Failed to drop all tables.');
            }
            else {
                Alert.alert('Cancelled', 'Operation cancelled.\nThe data wasn\'t deleted.');
            }
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
                title="Delete Data"
                onPress={handleDeleteData}
                color="#FF0000"
            />
        </View>
    );
}