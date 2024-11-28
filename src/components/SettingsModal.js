import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Modal from 'react-native-modal';
import { Picker } from '@react-native-picker/picker';
import { globalStyles } from '../styles/global';

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
    // Initialize global settings with default values if they are null
    if (global.showCovers === null) global.showCovers = "true";
    if (global.downloadCovers === null) global.downloadCovers = "true";

    const [showCovers, setShowCovers] = useState(global.showCovers);
    const [downloadCovers, setDownloadCovers] = useState(global.downloadCovers);

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
                if (global.showCovers !== null) {
                    await AsyncStorage.setItem('@music_nexus_show_covers', global.showCovers);
                }
                if (global.downloadCovers !== null) {
                    await AsyncStorage.setItem('@music_nexus_download_covers', global.downloadCovers);
                }
                console.log('Settings saved successfully: showCovers:', global.showCovers, 'downloadCovers:', global.downloadCovers);
            } catch (error) {
                console.error('Failed to save settings:', error);
            }
        };
        saveSettings();
    }, [showCovers, downloadCovers]);

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
                <View style={styles.modalView}>
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

                    <Button
                        title="Save"
                        onPress={closeModal}
                        color="green"
                    />
                </View>
            </View>
        </Modal>
    );
}

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
    },
    modalView: {
        width: '90%',
        backgroundColor: globalStyles.modalBackgroundColor,
        borderRadius: 20,
        padding: 35,
        alignItems: "center",
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