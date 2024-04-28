// This file contains the Profile screen, which allows the user to delete all songs in the database, check stats, and more personal information.

import React, { useState } from 'react';
import { View, Button, Alert, Text, Modal, StyleSheet } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { db, initDatabase } from '../database/databaseSetup';
import { deleteAllFilesFromCache } from '../utils/cacheManager';

export function Profile() {
    const [importProgress, setImportProgress] = useState(0);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [totalSongs, setTotalSongs] = useState(0);

    // Delete the cache and update cover_path of all songs to null
    const handleDeleteCache = async () => {
        try {
            await deleteAllFilesFromCache();
            // Update cover_path of all songs to null
            await new Promise((resolve, reject) => {
                db.transaction(tx => {
                    tx.executeSql('UPDATE songs SET cover_path = ?', [null], () => {
                        console.log('Cover paths updated to null.');
                        resolve(); // Resolve the promise when the transaction is successful
                    }, (_, error) => {
                        console.error('Error updating cover paths:', error);
                        reject(error); // Reject the promise if there's an error
                    });
                });
            });
            Alert.alert('Success', 'All files in the cache have been deleted and cover paths updated to null.');
        } catch (error) {
            console.error('Error deleting cache:', error);
            Alert.alert('Error', 'Failed to delete cache. Error: ' + error.message);
        }
    };
    

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

    // Function to handle the backup of all songs in the database to a JSON file
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

    // Function to handle the import of all songs from a JSON file
    const handleImportData = async () => {
        console.log("Attempting to import data...");
        setIsModalVisible(true); // Show the modal when the import starts
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: 'application/json',
            });
            console.log("File picker result:", result);

            if (result.assets && result.assets.length > 0) {
                const fileContent = await FileSystem.readAsStringAsync(result.assets[0].uri);
                console.log("File read successfully, content length:", fileContent.length);

                let songs = JSON.parse(fileContent);
                console.log("JSON parsed successfully, number of songs:", songs.length);
                setTotalSongs(songs.length);

                console.log(`Starting import of ${songs.length} songs...`);

                await insertSongsIntoDatabase(songs);
            } else {
                console.log("No file selected.");
                Alert.alert('Error', 'No file selected.');
            }
        } catch (error) {
            console.error('Import process failed:', error);
            Alert.alert('Error', 'Failed to import songs. Error: ' + error.message);
        } finally {
            setIsModalVisible(false);
        }
    };

    const insertSongsIntoDatabase = (songs) => {
        return new Promise((resolve) => {
            let insertedSongs = 0;
            let errors = [];

            const insertSong = (song) => {
                return new Promise((resolve) => {
                    db.transaction(tx => {
                        const title = (typeof song.title === 'string' ? song.title : "Unknown Title").replace(/'/g, "''");
                        const artist = (typeof song.artist === 'string' ? song.artist : "Unknown Artist").replace(/'/g, "''");
                        const album = (typeof song.album === 'string' ? song.album : "Unknown Album").replace(/'/g, "''");
                        const release = song.release || "1900-01-01";
                        const rating = song.rating || 0;
                        const sql = `INSERT INTO songs (title, artist, album, release, rating) VALUES ('${title}', '${artist}', '${album}', '${release}', ${rating})`;

                        tx.executeSql(
                            sql,
                            [],
                            () => {
                                insertedSongs++;
                                const progress = (insertedSongs / songs.length) * 100;
                                setImportProgress(progress);
                                resolve();
                            },
                            (_, error) => {
                                errors.push(error);
                                resolve();
                            }
                        );
                    });
                });
            };

            Promise.all(songs.map(insertSong))
                .then(() => {
                    if (errors.length > 0) {
                        console.log('Some songs failed to insert:', errors);
                        Alert.alert('Error', 'Some songs failed to insert.');
                    } else {
                        console.log('All songs inserted successfully');
                        Alert.alert('Success', 'Songs have been imported successfully.');
                    }
                    resolve();
                });
        });
    };

    return (
        <View
            style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'flex-end',
                paddingBottom: 16,
                backgroundColor: '#090909',
                padding: 16,
            }}
        >
            <View style={{ marginBottom: 10, width: '80%' }}>
                <Button
                    title="Backup Songs"
                    onPress={handleBackupData}
                    color="green"
                    style={{ width: '100%' }}
                />
            </View>
            <View style={{ marginBottom: 10, width: '80%' }}>
                <Button
                    title="Import Songs"
                    onPress={handleImportData}
                    color="blue"
                    style={{ width: '100%' }}
                />
            </View>
            <View style={{ marginBottom: 10, width: '80%' }}>
                <Button
                    title="Delete Data"
                    onPress={handleDeleteData}
                    color="red"
                    style={{ width: '100%' }}
                />
            </View>
            <View style={{ marginBottom: 10, width: '80%' }}>
                <Button
                    title="Delete Covers in Cache"
                    onPress={handleDeleteCache}
                    color="purple"
                    style={{ width: '100%' }}
                />
            </View>
            <Modal
                animationType="slide"
                transparent={true}
                visible={isModalVisible}
                onRequestClose={() => {
                    setIsModalVisible(!isModalVisible);
                }}
            >
                <View style={styles.centeredView}>
                    <View style={styles.modalView}>
                        <Text style={styles.modalText}>Importing {totalSongs} songs...</Text>
                        <Text style={styles.modalText}>Please keep the app open.</Text>
                        <Text style={styles.modalText}>Progress: {importProgress.toFixed(2)}%</Text>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    centeredView: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        marginTop: 22,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalView: {
        margin: 20,
        backgroundColor: "#1e272e",
        borderRadius: 20,
        padding: 35,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5
    },
    modalText: {
        marginBottom: 15,
        textAlign: "center",
        color: 'white',
        fontSize: 16,
    }
});