// The RatingModal component is a reusable modal component that allows users to rate a song.
// It displays a modal with a star rating component and a submit button.

import React, { useState, useEffect } from 'react';
import { Modal, View, TouchableOpacity, Text, TouchableWithoutFeedback, StyleSheet } from 'react-native';
import { Rating } from 'react-native-ratings';

const RatingModal = ({ isVisible, onClose, onRatingSelect, selectedSong }) => {
    // State to hold the rating value
    const [rating, setRating] = useState(0);

    // Update the rating state when the selected song changes
    useEffect(() => {
        // Show the rating of the selected song or 0 if no song is selected
        setRating(selectedSong ? selectedSong.rating : 0);
    }, [selectedSong]);

    // Function to handle the submission of the rating
    const handleRatingSubmit = () => {
        onRatingSelect(rating);
    };

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={isVisible}
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.modalContainer}>
                    <TouchableWithoutFeedback onPress={() => {}}>
                        <View style={styles.ratingContainer}>
                            <Rating
                                showRating
                                ratingCount={10}
                                fractions={1}
                                jumpValue={0.5}
                                imageSize={30}
                                tintColor='#1e272e'
                                startingValue={rating}
                                onFinishRating={(rating) => setRating(rating)}
                            />
                            <TouchableOpacity onPress={handleRatingSubmit} style={styles.submitButton}>
                                <Text style={styles.submitText}>Submit Rating</Text>
                            </TouchableOpacity>
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    ratingContainer: {
        backgroundColor: '#1e272e',
        borderRadius: 8,
        padding: 16,
        width: '80%',
    },
    submitButton: {
        backgroundColor: 'blue',
        borderRadius: 8,
        padding: 10,
        marginTop: 16,
    },
    submitText: {
        color: 'white',
        textAlign: 'center',
    },
});

export default RatingModal;