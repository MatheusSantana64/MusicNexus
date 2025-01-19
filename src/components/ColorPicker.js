import React, { useCallback } from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import Modal from 'react-native-modal';
import ColorPicker from 'react-native-wheel-color-picker';
import { colorPickerStyles as styles } from '../styles/componentsStyles';

const ColorPickerComponent = ({ isVisible, toggleModal, selectedColor, setSelectedColor }) => {

    const onColorChangeComplete = useCallback((color) => {
        setSelectedColor(color); // Update the parent component's state
    }, [setSelectedColor]);

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
                        style={styles.colorPicker}
                    />
                    <TouchableOpacity
                        style={[styles.saveButton, { backgroundColor: selectedColor }]}
                        onPress={toggleModal}
                    >
                        <Text style={styles.saveButtonText}>Save Color</Text>
                    </TouchableOpacity>
                </Modal>
            </View>
        </View>
    );
};

export default ColorPickerComponent;