// SettingsModal.js
import React, { useState } from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Modal from 'react-native-modal'; // https://www.npmjs.com/package/react-native-modal
import {Picker} from '@react-native-picker/picker';
import { globalStyles } from '../styles/global';

export default function SettingsModal({ isVisible, closeModal }) {
    const [showCovers, setShowCovers] = useState(global.showCovers);
    const [downloadCovers, setDownloadCovers] = useState(global.downloadCovers);

    const updateShowCovers = (value) => {
        setShowCovers(value);
        global.showCovers = value;
        saveSettings();
    };

    const updateDownloadCovers = (value) => {
        setDownloadCovers(value);
        global.downloadCovers = value;
        saveSettings();
    };

    // Function to save settings
    const saveSettings = async () => {
        try {
            await AsyncStorage.setItem('@music_nexus_show_covers', global.showCovers);
            await AsyncStorage.setItem('@music_nexus_download_covers', global.downloadCovers);
            console.log('Settings saved successfully: showCovers:', global.showCovers, 'downloadCovers:', global.downloadCovers);
        } catch (error) {
            console.error('Failed to save settings:', error);
        }
    };

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
            children={
                <View style={styles.centeredView}>
                    <View style={styles.modalView}>
                        <Text style={{ ...styles.modalText, fontSize: 30 }}>Settings</Text>
                        <Picker
                            style={styles.pickerStyles}
                            dropdownIconColor={'white'}
                            selectedValue={showCovers}
                            onValueChange={(itemValue) => updateShowCovers(itemValue)}>
                            <Picker.Item label="Display Album Covers" value="true" />
                            <Picker.Item label="Hide Album Covers" value="false" />
                        </Picker>
                        <Text style={{ ...styles.modalText, color: 'lightgrey', fontSize: 12 }}>Hide covers for improved performance and a minimalistic look.</Text>
                        <Text style={{ ...styles.modalText, color: 'lightgrey', marginBottom: 20, fontSize: 10 }}>If hiding, you can delete the covers to free up space.</Text>

                        <Picker
                            style={styles.pickerStyles}
                            dropdownIconColor={'white'}
                            selectedValue={downloadCovers}
                            onValueChange={(itemValue) => updateDownloadCovers(itemValue)}>
                            <Picker.Item label="Download Album Covers" value="true" />
                            <Picker.Item label="Online Album Covers" value="false" />
                        </Picker>
                        <Text style={{ ...styles.modalText, color: 'lightgrey', fontSize: 12 }}>Disabling downloads slightly reduces the cache size, but will require internet connection to display the covers.</Text>
                        <Text style={{ ...styles.modalText, color: 'lightgrey', marginBottom: 20, fontSize: 10 }}>If download is disabled, you can delete the covers to free up space.</Text>

                        <Button
                            title="Save"
                            onPress={closeModal}
                            color="green"
                        />
                    </View>
                </View>
            }
        >
        </Modal>
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
        textAlign: "center",
        color: 'white',
        fontSize: 16,
    },
    pickerStyles: {
        color: 'white',
        width: 300,
        backgroundColor: globalStyles.modalBackgroundColor,
        fontSize: 16,
    }
});