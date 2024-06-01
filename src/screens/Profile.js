// This file contains the Profile screen, which allows the user to delete all songs in the database, check stats, and more personal information.

import React, { useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Button, Alert, Text, Modal, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { getTotalSongs, getTotalArtists, getTotalAlbums, getSongsCountByRating, getSongsCountByYear } from '../database/databaseOperations';
import { fetchAllSongsAsJson, insertSongIntoDatabase, insertRatingHistory, fetchAlbumsWithoutCover, updateSongCoverPath, coverPathToNull, deleteData } from '../database/databaseOperations';
import { addToQueue } from '../api/MusicBrainzAPI';
import { downloadImage, generateCacheKey, getImageFromCache, deleteAllFilesFromCache } from '../utils/cacheManager';
import SettingsModal from '../components/SettingsModal';
import { useKeepAwake, activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import Icon from 'react-native-vector-icons/FontAwesome';

export function Profile() {
    const [isSettingsModalVisible, setIsSettingsModalVisible] = useState(false);

    const [totalSongs, setTotalSongs] = useState(0);
    const [totalArtists, setTotalArtists] = useState(0);
    const [totalAlbums, setTotalAlbums] = useState(0);
    const [songsCountByRating, setSongsCountByRating] = useState([]);
    const [songsCountByYear, setSongsCountByYear] = useState([]);

    const [isBackupModalVisible, setIsBackupModalVisible] = useState(false);

    const [progress, setProgress] = useState(0);
    const [totalOperation, setTotalOperation] = useState(0);

    const [isImportModalVisible, setIsImportModalVisible] = useState(false);

    const [isCoverModalVisible, setIsCoverModalVisible] = useState(false);
    const [errorsCount, setErrorsCount] = useState(0);

    useKeepAwake();

    useFocusEffect(
        React.useCallback(() => {
            const fetchStats = async () => {
                const totalSon = await getTotalSongs();
                const totalArt = await getTotalArtists();
                const totalAlb = await getTotalAlbums();
                const songsCountByRating = await getSongsCountByRating();
                const songsCountByYear = await getSongsCountByYear();

                setTotalSongs(totalSon);
                setTotalArtists(totalArt);
                setTotalAlbums(totalAlb);
                setSongsCountByRating(songsCountByRating);
                setSongsCountByYear(songsCountByYear);
            };

            fetchStats();
        }, [])
    );

    // Function to handle the backup of all songs in the database to a JSON file
    const handleBackupData = async () => {
        setIsBackupModalVisible(true); // Show the backup progress modal
        console.log("Attempting to backup data... Modal visible: " + isBackupModalVisible);

        try {
            // Fetch all songs from the database and convert them to JSON
            const songs = await fetchAllSongsAsJson();

            const jsonData = JSON.stringify(songs);

            setIsBackupModalVisible(false); // Hide the backup progress modal
            console.log("Data backup complete, JSON length: " + jsonData.length + ". Modal visible: " + isBackupModalVisible);

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
        setIsImportModalVisible(true);
        activateKeepAwakeAsync();
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
                setTotalOperation(songs.length);

                console.log(`Starting import of ${songs.length} songs...`);

                let insertedSongs = 0;
                let errors = [];

                for (const song of songs) {
                    try {
                        await insertSongIntoDatabase(song);
                        insertedSongs++;
                        // Insert rating history for the song
                        if (song.ratingHistory && song.ratingHistory.length > 0) {
                            for (const ratingHistory of song.ratingHistory) {
                                await insertRatingHistory(song.id, ratingHistory.rating, ratingHistory.previous_rating, ratingHistory.datetime);
                            }
                        }
                        setProgress(insertedSongs);
                    } catch (error) {
                        errors.push(error);
                    }
                }

                if (errors.length > 0) {
                    console.log('Some songs failed to insert:', errors);
                    Alert.alert('Error', 'Some songs failed to insert.');
                } else {
                    console.log('All songs inserted successfully');
                    Alert.alert('Success', 'Songs have been imported successfully.');
                }
            } else {
                console.log("No file selected.");
                Alert.alert('Error', 'No file selected.');
            }
        } catch (error) {
            console.error('Import process failed:', error);
            Alert.alert('Error', 'Failed to import songs. Error: ' + error.message);
        } finally {
            setIsImportModalVisible(false);
        }
        deactivateKeepAwake();
    };

    // Function to handle the download the cover of all songs
    const handleDownloadCovers = async () => {
        cancellationToken = { cancelled: false };

        // Keep screen awake
        activateKeepAwakeAsync();
    
        try {
            const albumsWithoutCover = await fetchAlbumsWithoutCover();
            console.log('albumsWithoutCover:', albumsWithoutCover);
            setIsCoverModalVisible(true); // Show the modal
            setTotalOperation(albumsWithoutCover.length);
            let processedSongs = 0;
            let errors = 0;

    
            for (const song of albumsWithoutCover) {
                console.log('Entered the loop in handleDownloadCovers of albumsWithoutCover.\nDownloading cover for album:', song.album, 'by', song.artist);
                // Check if the operation should be stopped
                if (cancellationToken.cancelled) {
                    console.log('Stopping cover download process due to user request.');
                    break; // Exit the loop
                }
                if (!cancellationToken.cancelled) {
                    // Check if the cover already exists in the cache
                    const cacheKey = generateCacheKey(song.artist, song.album);
                    const coverPathInCache = await getImageFromCache(cacheKey);
                    if (coverPathInCache) {
                        // If the cover exists in the cache, update the database with the cached path
                        //await updateSongCoverPath(song.id, coverPathInCache);
                        processedSongs++;
                    } else {
                        // If the cover does not exist in the cache, fetch it through the API
                        const coverPath = await addToQueue(song.artist, song.album);
                        if (coverPath) {
                            const downloadedPath = await downloadImage(coverPath, cacheKey);
                            if (downloadedPath) {
                                //await updateSongCoverPath(song.id, downloadedPath);
                                processedSongs++;
                            } else {
                                errors++;
                            }
                        } else {
                            errors++;
                        }
                    }
                    // Update progress
                    setProgress(processedSongs);
                    setErrorsCount(errors);
                }
            }
            if (cancellationToken.cancelled) {
                Alert.alert('Operation Stopped', 'The cover download operation has been stopped.');
            } else {
                Alert.alert('Success', `Covers downloaded for ${processedSongs} songs. ${errors} errors encountered.`);
            }
        } catch (error) {
            console.error('Error downloading covers:', error);
            Alert.alert('Error', 'Failed to download covers. Error: ' + error.message);
        } finally {
            setIsCoverModalVisible(false); // Hide the modal
            deactivateKeepAwake();
        }
    };

    const handleStopDownload = () => {
        cancellationToken.cancelled = true;
    };

    // Function to handle the deletion of all songs in the database
    const handleDeleteData = async () => {
        try {
            // First confirmation
            const firstConfirmation = await new Promise((resolve, reject) => {
                Alert.alert("Delete all data?", "Are you sure you want to delete all data?\nThis includes all songs and tags.",
                    [
                        { text: 'Cancel', onPress: () => reject(new Error('Cancelled')) },
                        { text: 'OK', onPress: () => resolve(true) },
                    ],
                    { cancelable: false }
                );
            });
            if (!firstConfirmation) { return; }

            // Second confirmation
            const secondConfirmation = await new Promise((resolve, reject) => {
                Alert.alert("Delete all data?", "This action cannot be undone!\nAre you sure you want to proceed?",
                    [
                        { text: 'Cancel', onPress: () => reject(new Error('Cancelled')) },
                        { text: 'OK', onPress: () => resolve(true) },
                    ],
                    { cancelable: false }
                );
            });
            if (!secondConfirmation) { return; }

            // Proceed with data deletion
            await deleteData();
            Alert.alert('Success', 'Data deleted.');
        } 
        catch (error) {
            if (error.message !== 'Cancelled') {
                Alert.alert('Error', 'Failed to delete data.');
            } else {
                Alert.alert('Cancelled', 'Operation cancelled.\nThe data wasn\'t deleted.');
            }
        }
    };

    // Delete the cache and update cover_path of all songs to null
    const handleDeleteCache = async () => {
        try {
            await deleteAllFilesFromCache();
            await coverPathToNull();
            Alert.alert('Success', 'All files in the cache have been deleted and cover paths updated to null.');
        } 
        catch (error) {
            console.error('Error deleting cache:', error);
            Alert.alert('Error', 'Failed to delete cache. Error: ' + error.message);
        }
    };

    return (
        <View style={{ flex: 1 }}>
            <View style={{
                position: 'absolute',
                top: 15,
                right: 15,
                zIndex: 1,
            }}>
                <TouchableOpacity onPress={() => {
                    setIsSettingsModalVisible(true);
                }}>
                    <Icon name="gear" size={40} color="#fff" />
                </TouchableOpacity>
            </View>
            
            <SettingsModal isVisible={isSettingsModalVisible} closeModal={() => setIsSettingsModalVisible(false)} />
    
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
                <View style={styles.stats}>
                    <Text style={styles.statsTitle}>Stats</Text>
                    <ScrollView contentContainerStyle={{ flexDirection: 'row', justifyContent: 'space-between' }} persistentScrollbar={true}>
                        <View style={{ flex: 1 }}>
                            <Text style={{ ...styles.statsText, color: 'skyblue' }}>{totalSongs} songs</Text>
                            <Text style={{ ...styles.statsText, color: 'pink' }}>{totalArtists} artists</Text>
                            <Text style={{ ...styles.statsText, color: 'lightgreen' }}>{totalAlbums} albums</Text>
                            <View style={{ flex: 1 }}>
                                <Text style={{ ...styles.statsText, marginBottom: 2, marginTop: 6, color: 'khaki' }}>Ratings:</Text>
                                {songsCountByRating.map((item, index) => (
                                    <Text style={{ ...styles.statsText, marginBottom: 2, color: 'khaki', fontWeight: 'normal' }} key={index}>{item.rating === 0 ? 'Not Rated' : item.rating === 10 ? 'Rated '+item.rating.toFixed(0) : 'Rated '+item.rating.toFixed(1)}: <Text style={{ fontWeight: 'bold', color: 'white' }}>{item.count}</Text></Text>
                                ))}
                            </View>
                        </View>
                        <View style={{ width: 1, backgroundColor: 'black', marginRight: 10 }} />
                        <View style={{ flex: 1 }}>
                            <Text style={{ ...styles.statsText, marginBottom: 2, color: 'mediumpurple' }}>Years:</Text>
                            {songsCountByYear.map((item, index) => (
                                <Text style={{ ...styles.statsText, marginBottom: 2, color: 'mediumpurple', fontWeight: 'normal' }} key={index}>{item.year}: <Text style={{ fontWeight: 'bold', color: 'white' }}>{item.count}</Text></Text>
                            ))}
                        </View>
                    </ScrollView>
                </View>

                <View style={{ marginBottom: 10, width: '80%' }}>
                    <Button
                        title="Backup Songs"
                        onPress={handleBackupData}
                        color="darkgreen"
                        style={{ width: '100%' }}
                    />
                </View>
                <View style={{ marginBottom: 10, width: '80%' }}>
                    <Button
                        title="Import Songs From File"
                        onPress={handleImportData}
                        color="darkblue"
                        style={{ width: '100%' }}
                    />
                </View>
                <View style={{ marginBottom: 10, width: '80%' }}>
                    <Button
                        title="Download All Covers"
                        onPress={handleDownloadCovers}
                        color="darkslategrey"
                        style={{ width: '100%' }}
                    />
                </View>
                <View style={{ marginBottom: 10, width: '80%' }}>
                    <Button
                        title="Delete Data (Songs and Tags)"
                        onPress={handleDeleteData}
                        color="darkred"
                        style={{ width: '100%' }}
                    />
                </View>
                <View style={{ marginBottom: 10, width: '80%' }}>
                    <Button
                        title="Delete Album Covers From Cache"
                        onPress={handleDeleteCache}
                        color="indigo"
                        style={{ width: '100%' }}
                    />
                </View>

                <Modal
                    animationType="slide"
                    transparent={true}
                    visible={isBackupModalVisible}
                    onRequestClose={() => {
                        setIsBackupModalVisible(false);
                    }}
                >
                    <View style={styles.centeredView}>
                        <View style={styles.modalView}>
                            <Text style={styles.modalText}>Backing up data...</Text>
                            <Text style={{ ...styles.modalText, fontSize: 14 }}>This might take a few seconds.</Text>
                        </View>
                    </View>
                </Modal>

                <Modal
                    animationType="slide"
                    transparent={true}
                    visible={isCoverModalVisible}
                    onRequestClose={() => {
                        setIsCoverModalVisible(!isCoverModalVisible);
                    }}
                >
                    <View style={styles.centeredView}>
                        <View style={styles.modalView}>
                            <Text style={{ ...styles.modalText, marginBottom: 0 }}>Processing covers for {totalOperation} albums...</Text>
                            <Text style={{ ...styles.modalText, fontSize: 14 }}>This might take a few minutes.</Text>
                            <Text style={styles.modalText}>Processed: {progress} / {totalOperation}</Text>
                            <Text style={{ ...styles.modalText, color: 'limegreen' }}>Success: {Math.max(progress - errorsCount, 0)}</Text>
                            <Text style={{ ...styles.modalText, color: 'crimson' }}>Failed: {errorsCount}</Text>
                            <Button
                                title="Stop"
                                onPress={handleStopDownload}
                                color="red"
                            />
                        </View>
                    </View>
                </Modal>

                <Modal
                    animationType="slide"
                    transparent={true}
                    visible={isImportModalVisible}
                    onRequestClose={() => {
                        setIsImportModalVisible(!isImportModalVisible);
                    }}
                >
                    <View style={styles.centeredView}>
                        <View style={styles.modalView}>
                            <Text style={styles.modalText}>Importing {totalOperation} songs...</Text>
                            <Text style={styles.modalText}>Please keep the app open.</Text>
                            <Text style={styles.modalText}>Progress: {progress} / {totalOperation}</Text>
                        </View>
                    </View>
                </Modal>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    stats: {
        padding: 16,
        backgroundColor: '#1e272e',
        width: '80%',
        height: '50%',
        marginVertical: 16,
        borderRadius: 10,
    },
    statsTitle: {
        color: 'white',
        fontSize: 32,
        marginBottom: 12,
        textAlign: 'left',
    },
    statsText: {
        color: 'white',
        fontSize: 16,
        marginBottom: 4,
        textAlign: 'left',
        fontWeight: 'bold',
    },

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