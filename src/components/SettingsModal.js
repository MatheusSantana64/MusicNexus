import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, Button, StyleSheet, Alert, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Modal from 'react-native-modal';
import { Picker } from '@react-native-picker/picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useKeepAwake, activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { globalStyles } from '../styles/global';
import { 
    fetchAllDataAsJson, 
    insertAllDataIntoDatabase, 
    fetchAlbumsWithoutCover, 
    coverPathToNull, 
    deleteData,
    clearDatabase,
} from '../database/databaseOperations';
import { addToQueue } from '../api/MusicBrainzAPI';
import { downloadImage, generateCacheKey, getImageFromCache, deleteAllFilesFromCache } from '../utils/cacheManager';

const PickerComponent = ({ selectedValue, onValueChange, items }) => (
    <Picker
        style={styles.pickerStyles}
        dropdownIconColor={'white'}
        selectedValue={selectedValue}
        onValueChange={onValueChange}>
        {items.map((item, index) => (
            <Picker.Item key={index} label={item.label} value={item.value} />
        ))}
    </Picker>
);

export default function SettingsModal({ isVisible, closeModal }) {
    // Initialize global settings with default values if they are null or undefined
    if (global.showCovers === null || global.showCovers === undefined) global.showCovers = "true";
    if (global.downloadCovers === null || global.downloadCovers === undefined) global.downloadCovers = "true";

    const [showCovers, setShowCovers] = useState(global.showCovers);
    const [downloadCovers, setDownloadCovers] = useState(global.downloadCovers);
    const [state, setState] = useState({
        isBackupModalVisible: false,
        isImportModalVisible: false,
        isCoverModalVisible: false,
        progress: 0,
        totalOperation: 0,
        errorsCount: 0,
    });

    const cancellationTokenRef = useRef({ cancelled: false });

    useKeepAwake();

    const updateShowCovers = useCallback((value) => {
        setShowCovers(value);
        global.showCovers = value;
    }, []);

    const updateDownloadCovers = useCallback((value) => {
        setDownloadCovers(value);
        global.downloadCovers = value;
    }, []);

    useEffect(() => {
        const saveSettings = async () => {
            try {
                if (global.showCovers !== null && global.showCovers !== undefined) {
                    await AsyncStorage.setItem('@music_nexus_show_covers', global.showCovers);
                }
                if (global.downloadCovers !== null && global.downloadCovers !== undefined) {
                    await AsyncStorage.setItem('@music_nexus_download_covers', global.downloadCovers);
                }
                console.log('Settings saved successfully: showCovers:', global.showCovers, 'downloadCovers:', global.downloadCovers);
            } catch (error) {
                console.error('Failed to save settings:', error);
            }
        };
        saveSettings();
    }, [showCovers, downloadCovers]);

    const handleBackupData = useCallback(async () => {
        setState(prevState => ({ ...prevState, isBackupModalVisible: true }));
    
        try {
            const data = await fetchAllDataAsJson();
            const jsonData = JSON.stringify(data);
            const tempFile = FileSystem.cacheDirectory + 'MusicNexus_backup.json';
            await FileSystem.writeAsStringAsync(tempFile, jsonData);
    
            const isAvailable = await Sharing.isAvailableAsync();
            if (!isAvailable) {
                Alert.alert('Error', 'Sharing is not available on this device.');
                return;
            }
    
            await Sharing.shareAsync(tempFile);
        } catch (error) {
            console.error('Backup process failed:', error);
            Alert.alert('Error', 'Failed to create backup. Error: ' + error.message);
        } finally {
            setState(prevState => ({ ...prevState, isBackupModalVisible: false }));
        }
    }, []);
    
    const handleImportData = useCallback(async () => {
        const confirmImport = await new Promise((resolve, reject) => {
            Alert.alert(
                "Import Backup",
                "Importing a backup file will delete all current data. Do you want to proceed?",
                [
                    { text: 'Cancel', onPress: () => reject(new Error('Cancelled')) },
                    { text: 'OK', onPress: () => resolve(true) },
                ],
                { cancelable: false }
            );
        });
    
        if (!confirmImport) return;
    
        setState(prevState => ({ ...prevState, isImportModalVisible: true }));
        activateKeepAwakeAsync();
    
        try {
            const result = await DocumentPicker.getDocumentAsync({ type: 'application/json' });
            if (result.assets && result.assets.length > 0) {
                const fileContent = await FileSystem.readAsStringAsync(result.assets[0].uri);
                const data = JSON.parse(fileContent);
    
                await clearDatabase(); // Clear the database before importing new data
    
                setState(prevState => ({ ...prevState, totalOperation: data.songs.length, progress: 0 }));
    
                await insertAllDataIntoDatabase(data, (currentProgress, total) => {
                    setState(prevState => ({ ...prevState, progress: currentProgress, totalOperation: total }));
                });
    
                Alert.alert('Success', 'Data has been imported successfully.');
            } else {
                Alert.alert('Error', 'No file selected.');
            }
        } catch (error) {
            console.error('Import process failed:', error);
            Alert.alert('Error', 'Failed to import data. Error: ' + error.message);
        } finally {
            setState(prevState => ({ ...prevState, isImportModalVisible: false }));
            deactivateKeepAwake();
        }
    }, []);

    const handleDownloadCovers = useCallback(async () => {
        cancellationTokenRef.current.cancelled = false;
        activateKeepAwakeAsync();
    
        try {
            const albumsWithoutCover = await fetchAlbumsWithoutCover();
            setState(prevState => ({ ...prevState, isCoverModalVisible: true, totalOperation: albumsWithoutCover.length }));
    
            let processedSongs = 0;
            let errors = 0;
    
            for (const song of albumsWithoutCover) {
                if (cancellationTokenRef.current.cancelled) break;
    
                const cacheKey = generateCacheKey(song.artist, song.album);
                const coverPathInCache = await getImageFromCache(cacheKey);
                if (coverPathInCache) {
                    processedSongs++;
                } else {
                    const coverPath = await addToQueue(song.artist, song.album);
                    if (coverPath) {
                        const downloadedPath = await downloadImage(coverPath, cacheKey);
                        if (downloadedPath) {
                            processedSongs++;
                        } else {
                            errors++;
                        }
                    } else {
                        errors++;
                    }
                }
    
                if (cancellationTokenRef.current.cancelled) break;
    
                setState(prevState => ({ ...prevState, progress: processedSongs, errorsCount: errors }));
            }
    
            if (cancellationTokenRef.current.cancelled) {
                Alert.alert('Operation Stopped', 'The cover download operation has been stopped.');
            } else {
                Alert.alert('Success', `Covers downloaded for ${processedSongs} songs.\nUnable to find covers for ${errors} songs.`);
            }
        } catch (error) {
            console.error('Error downloading covers:', error);
            Alert.alert('Error', 'Failed to download covers. Error: ' + error.message);
        } finally {
            setState(prevState => ({ ...prevState, isCoverModalVisible: false }));
            deactivateKeepAwake();
        }
    }, []);

    const handleStopDownload = useCallback(() => {
        cancellationTokenRef.current.cancelled = true;
    }, []);

    const handleDeleteData = useCallback(async () => {
        try {
            const firstConfirmation = await new Promise((resolve, reject) => {
                Alert.alert("Delete all data?", "Are you sure you want to delete all data?\nThis includes all songs and tags.",
                    [
                        { text: 'Cancel', onPress: () => reject(new Error('Cancelled')) },
                        { text: 'OK', onPress: () => resolve(true) },
                    ],
                    { cancelable: false }
                );
            });
            if (!firstConfirmation) return;

            const secondConfirmation = await new Promise((resolve, reject) => {
                Alert.alert("Delete all data?", "This action cannot be undone!\nAre you sure you want to proceed?",
                    [
                        { text: 'Cancel', onPress: () => reject(new Error('Cancelled')) },
                        { text: 'OK', onPress: () => resolve(true) },
                    ],
                    { cancelable: false }
                );
            });
            if (!secondConfirmation) return;

            await deleteData();
            Alert.alert('Success', 'Data deleted.');
        } catch (error) {
            if (error.message !== 'Cancelled') {
                Alert.alert('Error', 'Failed to delete data.');
            } else {
                Alert.alert('Cancelled', 'Operation cancelled.\nThe data wasn\'t deleted.');
            }
        }
    }, []);

    const handleDeleteCache = useCallback(async () => {
        try {
            await deleteAllFilesFromCache();
            await coverPathToNull();
            Alert.alert('Success', 'All files in the cache have been deleted and cover paths updated to null.');
        } catch (error) {
            console.error('Error deleting cache:', error);
            Alert.alert('Error', 'Failed to delete cache. Error: ' + error.message);
        }
    }, []);

    return (
        <Modal
            isVisible={isVisible}
            onBackdropPress={closeModal}
            onBackButtonPress={closeModal}
            style={styles.modalContainer}
            useNativeDriverForBackdrop={true}
            hideModalContentWhileAnimating={true}
            animationInTiming={100}
            animationOutTiming={100}
        >
            <View style={styles.centeredView}>
                <ScrollView contentContainerStyle={styles.modalView}>
                    <Text style={{ ...styles.modalText, fontSize: 30 }}>Settings</Text>
                    <PickerComponent
                        selectedValue={showCovers}
                        onValueChange={updateShowCovers}
                        items={[
                            { label: "Display Album Covers", value: "true" },
                            { label: "Hide Album Covers", value: "false" }
                        ]}
                    />
                    <Text style={{ ...styles.modalText, color: 'lightgrey', fontSize: 12 }}>Hide covers for improved performance and a minimalistic look.</Text>
                    <Text style={{ ...styles.modalText, color: 'lightgrey', marginBottom: 20, fontSize: 10 }}>If hiding, you can delete the covers to free up space.</Text>
    
                    <PickerComponent
                        selectedValue={downloadCovers}
                        onValueChange={updateDownloadCovers}
                        items={[
                            { label: "Download Album Covers", value: "true" },
                            { label: "Online Album Covers", value: "false" }
                        ]}
                    />
                    <Text style={{ ...styles.modalText, color: 'lightgrey', fontSize: 12 }}>Disabling downloads slightly reduces the cache size, but will require internet connection to display the covers.</Text>
                    <Text style={{ ...styles.modalText, color: 'lightgrey', marginBottom: 20, fontSize: 10 }}>If download is disabled, you can delete the covers to free up space.</Text>
    
                    <View style={styles.buttonContainer}>
                        <View style={styles.buttonRow}>
                            <View style={styles.button}>
                                <Button title="Export Backup" onPress={handleBackupData} color={globalStyles.green2} />
                            </View>
                            <View style={styles.button}>
                                <Button title="Import Backup" onPress={handleImportData} color={globalStyles.blue2} />
                            </View>
                        </View>

                        <View style={styles.buttonRow}>
                            <View style={styles.button}>
                                <Button title="Download Covers" onPress={handleDownloadCovers} color={globalStyles.gray3} />
                            </View>
                            <View style={styles.button}>
                                <Button title="Delete Covers" onPress={handleDeleteCache} color={globalStyles.purple2} />
                            </View>
                        </View>

                        <View style={{ marginBottom: 10 }}>
                            <Button title="Delete Data" onPress={handleDeleteData} color={globalStyles.red2} />
                        </View>
                        <View style={{ marginTop: 10 }}>
                            <Button title="Close" onPress={closeModal} color={globalStyles.green2} />
                        </View>
                    </View>
                </ScrollView>
    
                {/* Modals for operations */}
                <ModalComponent isVisible={state.isBackupModalVisible} onRequestClose={() => setState(prevState => ({ ...prevState, isBackupModalVisible: false }))}>
                    <Text style={styles.modalText}>Backing up data...</Text>
                    <Text style={{ ...styles.modalText, fontSize: 14 }}>This might take a few seconds.</Text>
                </ModalComponent>
    
                <ModalComponent isVisible={state.isCoverModalVisible} onRequestClose={() => setState(prevState => ({ ...prevState, isCoverModalVisible: false }))}>
                    <Text style={{ ...styles.modalText, marginBottom: 0 }}>Processing covers for {state.totalOperation} albums...</Text>
                    <Text style={{ ...styles.modalText, fontSize: 14 }}>This might take a few minutes.</Text>
                    <Text style={styles.modalText}>Processed: {state.progress} / {state.totalOperation}</Text>
                    <Text style={{ ...styles.modalText, color: 'limegreen' }}>Success: {Math.max(state.progress - state.errorsCount, 0)}</Text>
                    <Text style={{ ...styles.modalText, color: 'crimson' }}>Failed: {state.errorsCount}</Text>
                    <Button title="Stop" onPress={handleStopDownload} color="red" />
                </ModalComponent>
    
                <ModalComponent isVisible={state.isImportModalVisible} onRequestClose={() => setState(prevState => ({ ...prevState, isImportModalVisible: false }))}>
                    <Text style={styles.modalText}>Importing {state.totalOperation} songs...</Text>
                    <Text style={styles.modalText}>Please keep the app open.</Text>
                    <Text style={styles.modalText}>Progress: {state.progress} / {state.totalOperation}</Text>
                </ModalComponent>
            </View>
        </Modal>
    );
}

const ModalComponent = ({ isVisible, onRequestClose, children }) => (
    <Modal
        animationType="slide"
        transparent={true}
        visible={isVisible}
        onRequestClose={onRequestClose}
    >
        <View style={styles.centeredView}>
            <View style={styles.modalView}>
                {children}
            </View>
        </View>
    </Modal>
);

const styles = StyleSheet.create({
    centeredView: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        margin: 0,
        width: '100%',
        marginTop: '20%',
    },
    modalView: {
        width: '90%',
        backgroundColor: globalStyles.modalBackgroundColor,
        borderRadius: 20,
        paddingVertical: 35,
        paddingHorizontal: 20,
        alignItems: "center",
    },
    modalText: {
        textAlign: "center",
        color: 'white',
        fontSize: 16,
    },
    pickerStyles: {
        color: 'white',
        width: 300,
        backgroundColor: globalStyles.modalBackgroundColor,
        fontSize: 16,
    },
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    button: {
        marginHorizontal: 4,
        width: '50%',
    }
});