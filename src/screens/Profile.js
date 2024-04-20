// This file contains the Profile screen, which allows the user to delete all songs in the database, check stats, and more personal information.

import React from 'react';
import { View, Button, Alert } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
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

            Alert.alert('Success', 'Data deleted.');

            // Recreate the tables
            initDatabase();
        } 
        catch (error) {
            // Only show the error message if an actual error occurs
            if (error.message !== 'Cancelled') {
                Alert.alert('Error', 'Failed to delete data.');
            }
            else {
                Alert.alert('Cancelled', 'Operation cancelled.\nThe data wasn\'t deleted.');
            }
        }
    };

    // Function to handle the backup of all songs in the database
    const handleBackupData = async () => {
        try {
            // Fetch all songs from the database
            const songs = await new Promise((resolve, reject) => {
                db.transaction(tx => {
                    tx.executeSql('SELECT * FROM songs', [], (_, { rows: { _array } }) => {
                        resolve(_array);
                    }, (_, error) => {
                        console.error('Error fetching songs:', error);
                        reject(error);
                    });
                });
            });

            // Convert songs to JSON
            const jsonData = JSON.stringify(songs);

            // Create a temporary file with the JSON data
            const tempFile = FileSystem.cacheDirectory + 'MusicNexus_backup.json';
            await FileSystem.writeAsStringAsync(tempFile, jsonData);

            // Check if sharing is available on the device
            const isAvailable = await Sharing.isAvailableAsync();
            if (!isAvailable) {
                Alert.alert('Error', 'Sharing is not available on this device.');
                return;
            }

            // Share the temporary file, allowing the user to choose the save location
            await Sharing.shareAsync(tempFile);
        } catch (error) {
            console.error('Backup process failed:', error);
            Alert.alert('Error', 'Failed to create backup. Error: ' + error.message);
        }
    };

    const handleImportData = async () => {
        console.log("Attempting to import data..."); // Log statement to confirm function call
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: 'application/json',
            });
            console.log("File picker result:", result);

            if (result.assets && result.assets.length > 0) {
                const fileContent = await FileSystem.readAsStringAsync(result.assets[0].uri);
                console.log("File read successfully, content length:", fileContent.length);

                let songs;
                try {
                    songs = JSON.parse(fileContent);
                    console.log("JSON parsed successfully, number of songs:", songs.length);
                } catch (error) {
                    console.error("Error parsing JSON:", error);
                    Alert.alert('Error', 'Failed to parse the JSON file. Error: ' + error.message);
                    return;
                }

                // Insert the imported songs into the database
                await insertSongsIntoDatabase(songs);

                Alert.alert('Success', 'Songs have been imported successfully.');
            } else {
                console.log("No file selected.");
                Alert.alert('Error', 'No file selected.');
            }
        } catch (error) {
            console.error('Import process failed:', error);
            Alert.alert('Error', 'Failed to import songs. Error: ' + error.message);
        }
    };

    const insertSongsIntoDatabase = async (songs) => {
        db.transaction(tx => {
            songs.forEach(song => {
                // Adjust the INSERT statement to exclude the 'id' field
                tx.executeSql(
                    'INSERT INTO songs (title, artist, album, release, rating) VALUES (?, ?, ?, ?, ?)',
                    [song.title, song.artist, song.album, song.release, song.rating],
                    () => console.log('Song imported successfully'),
                    (_, error) => console.log('Error importing song:', error)
                );
            });
        });
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
            <Button
                title="Backup Songs"
                onPress={handleBackupData}
                color="#00FF00"
            />
            <Button
                title="Import Songs"
                onPress={handleImportData}
                color="#0000FF"
            />
        </View>
    );
}