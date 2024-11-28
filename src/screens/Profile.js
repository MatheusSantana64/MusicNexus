import React, { useState, useCallback, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Button, Alert, Text, Modal, StyleSheet, ScrollView, Pressable } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { 
    getTotalSongs, 
    getTotalArtists, 
    getTotalAlbums, 
    getSongsCountByRating, 
    getSongsCountByYear, 
    fetchAllDataAsJson, 
    insertAllDataIntoDatabase, 
    insertSongIntoDatabase, 
    insertRatingHistory, 
    fetchAlbumsWithoutCover, 
    updateSongCoverPath, 
    coverPathToNull, 
    deleteData 
} from '../database/databaseOperations';
import { addToQueue } from '../api/MusicBrainzAPI';
import { downloadImage, generateCacheKey, getImageFromCache, deleteAllFilesFromCache } from '../utils/cacheManager';
import SettingsModal from '../components/SettingsModal';
import { useKeepAwake, activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import Icon from 'react-native-vector-icons/FontAwesome';
import { globalStyles } from '../styles/global';

const Stats = ({ totalSongs, totalArtists, totalAlbums, songsCountByRating, songsCountByYear }) => (
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
);

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

export function Profile() {
    const [state, setState] = useState({
        isSettingsModalVisible: false,
        totalSongs: 0,
        totalArtists: 0,
        totalAlbums: 0,
        songsCountByRating: [],
        songsCountByYear: [],
        isBackupModalVisible: false,
        progress: 0,
        totalOperation: 0,
        isImportModalVisible: false,
        isCoverModalVisible: false,
        errorsCount: 0,
    });

    useKeepAwake();

    useFocusEffect(
        useCallback(() => {
            const fetchStats = async () => {
                const totalSon = await getTotalSongs();
                const totalArt = await getTotalArtists();
                const totalAlb = await getTotalAlbums();
                const songsCountByRating = await getSongsCountByRating();
                const songsCountByYear = await getSongsCountByYear();

                setState(prevState => ({
                    ...prevState,
                    totalSongs: totalSon,
                    totalArtists: totalArt,
                    totalAlbums: totalAlb,
                    songsCountByRating,
                    songsCountByYear,
                }));
            };

            fetchStats();
        }, [])
    );

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
        setState(prevState => ({ ...prevState, isImportModalVisible: true }));
        activateKeepAwakeAsync();
    
        try {
            const result = await DocumentPicker.getDocumentAsync({ type: 'application/json' });
            if (result.assets && result.assets.length > 0) {
                const fileContent = await FileSystem.readAsStringAsync(result.assets[0].uri);
                const data = JSON.parse(fileContent);
    
                await insertAllDataIntoDatabase(data);
    
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
        const cancellationToken = { cancelled: false };
        activateKeepAwakeAsync();

        try {
            const albumsWithoutCover = await fetchAlbumsWithoutCover();
            setState(prevState => ({ ...prevState, isCoverModalVisible: true, totalOperation: albumsWithoutCover.length }));

            let processedSongs = 0;
            let errors = 0;

            for (const song of albumsWithoutCover) {
                if (cancellationToken.cancelled) break;

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
                setState(prevState => ({ ...prevState, progress: processedSongs, errorsCount: errors }));
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
            setState(prevState => ({ ...prevState, isCoverModalVisible: false }));
            deactivateKeepAwake();
        }
    }, []);

    const handleStopDownload = useCallback(() => {
        cancellationToken.cancelled = true;
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
        <View style={{ flex: 1 }}>
            <View style={{ position: 'absolute', top: 15, right: 15, zIndex: 1 }}>
                <Pressable onPress={() => setState(prevState => ({ ...prevState, isSettingsModalVisible: true }))}>
                    <Icon name="gear" size={32} color="#fff" />
                </Pressable>
            </View>

            <SettingsModal isVisible={state.isSettingsModalVisible} closeModal={() => setState(prevState => ({ ...prevState, isSettingsModalVisible: false }))} />

            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 16, backgroundColor: globalStyles.defaultBackgroundColor, padding: 16 }}>
                <Stats
                    totalSongs={state.totalSongs}
                    totalArtists={state.totalArtists}
                    totalAlbums={state.totalAlbums}
                    songsCountByRating={state.songsCountByRating}
                    songsCountByYear={state.songsCountByYear}
                />

                <View style={{ marginBottom: 10, width: '80%' }}>
                    <Button title="Backup Songs" onPress={handleBackupData} color={globalStyles.green2} />
                </View>
                <View style={{ marginBottom: 10, width: '80%' }}>
                    <Button title="Import Songs From File" onPress={handleImportData} color={globalStyles.blue2} />
                </View>
                <View style={{ marginBottom: 10, width: '80%' }}>
                    <Button title="Download All Covers" onPress={handleDownloadCovers} color={globalStyles.gray3} />
                </View>
                <View style={{ marginBottom: 10, width: '80%' }}>
                    <Button title="Delete Data (Songs and Tags)" onPress={handleDeleteData} color={globalStyles.red2} />
                </View>
                <View style={{ marginBottom: 10, width: '80%' }}>
                    <Button title="Delete Album Covers From Cache" onPress={handleDeleteCache} color={globalStyles.purple2} />
                </View>

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
        </View>
    );
}

const styles = StyleSheet.create({
    stats: {
        padding: 16,
        backgroundColor: globalStyles.defaultBackgroundColor,
        width: '80%',
        height: '60%',
        marginVertical: 16,
        borderRadius: 10,
    },
    statsTitle: {
        color: 'white',
        fontSize: 16,
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
        backgroundColor: globalStyles.modalBackgroundColor,
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