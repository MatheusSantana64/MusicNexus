import React, { useState } from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity, StyleSheet } from 'react-native';
import Modal from 'react-native-modal';
import ColorPicker from 'react-native-wheel-color-picker';

const ColorPickerComponent = ({ isVisible, toggleModal, selectedColor, setSelectedColor }) => {

    const onColorChangeComplete = (color) => {
        setSelectedColor(color); // Update the parent component's state
    };

    // Modal container
    return (
        <View style={styles.container}>
            <View style={styles.modalContent}>
                <Modal
                    isVisible={isVisible}
                    onBackButtonPress={toggleModal}
                    useNativeDriverForBackdrop={true}
                    hideModalContentWhileAnimating={true}
                    animationInTiming={100}
                    animationOutTiming={100}
                    onRequestClose={toggleModal}
                >
                    <ColorPicker
                        color={selectedColor}
                        onColorChangeComplete={onColorChangeComplete}
                        thumbSize={40}
                        sliderSize={40}
                        gapSize={40}
                        noSnap={true}
                        row={false}
                        wheelLoadingIndicator={<ActivityIndicator size={40} />}
                        sliderLoadingIndicator={<ActivityIndicator size={20} />}
                        useNativeDriver={false}
                        useNativeLayout={false}
                        shadeWheelThumb={false}
                        shadeSliderThumb={true}
                        style={{ width: '90%', alignSelf: 'center', marginBottom: 50, marginTop: 150 }}
                    />
                    <TouchableOpacity
                        style={{ ...styles.saveButton, backgroundColor: selectedColor, borderWidth: 1, borderColor: 'grey' }}
                        onPress={() => {
                            toggleModal();
                        }}
                    >
                        <Text style={{ color: 'white', textAlign: 'center' }}>Save Color</Text>
                    </TouchableOpacity>
                </Modal>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    saveButton: {
        marginTop: 20,
        padding: 10,
        width: '50%',
        alignSelf: 'center',
        borderRadius: 10,
    },
});

export default ColorPickerComponent;