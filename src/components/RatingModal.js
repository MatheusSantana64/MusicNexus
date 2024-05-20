// The RatingModal component is a reusable modal component that allows users to rate a song.
// It displays a modal with a star rating component and a submit button.

import React, { useState } from 'react';
import { View, TouchableOpacity, Text, TouchableWithoutFeedback, StyleSheet } from 'react-native';
import { Rating } from 'react-native-ratings'; // https://www.npmjs.com/package/react-native-ratings
import Modal from 'react-native-modal'; // https://www.npmjs.com/package/react-native-modal

const RatingModal = ({ isRatingModalVisible, closeModal, handleRatingSelect, selectedSong, songs, setSongs }) => {
    // State to hold the rating value
    const [rating, setRating] = useState(0);

    // Function to handle the submission of the rating
    const handleRatingSubmit = () => {
        console.log(`Rating submitted for song: ${selectedSong.title} by ${selectedSong.artist}, Old Rating: ${selectedSong.rating}, New Rating: ${rating}`);
        // Check if new rating is different from old rating
        if (rating === selectedSong.rating) {
            closeModal();
            return;
        }
        const updatedSongs = songs.map(song => song.id === selectedSong.id ? { ...song, rating } : song);
        setSongs(updatedSongs);
        handleRatingSelect(rating);
    };

    return (
        <Modal
            isVisible={isRatingModalVisible}
            onBackdropPress={closeModal}
            onBackButtonPress={closeModal}
            style={styles.modalContainer}
            useNativeDriverForBackdrop={true}
            hideModalContentWhileAnimating={true}
            animationInTiming={100}
            animationOutTiming={100}
            children={
                <View style={styles.ratingContainer}>
                    <Rating
                        fractions={1}
                        ratingCount={10}
                        jumpValue={0.5}
                        imageSize={30}
                        tintColor='#1e272e'
                        startingValue={selectedSong.rating}
                        showRating
                        onFinishRating={(rating) => setRating(rating)}
                    />
                    <TouchableOpacity onPress={handleRatingSubmit} style={styles.submitButton}>
                        <Text style={styles.submitText}>Save Rating</Text>
                    </TouchableOpacity>
                </View>
            }
        > 
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalContainer: {
        margin: 0,
        width: '100%',
        alignItems: 'center',
    },
    ratingContainer: {
        backgroundColor: '#1e272e',  
        borderRadius: 10,
        padding: 16,
        width: '80%',
        alignItems: 'stretch', // 'stretch' is necessary for stars to look fine for some reason
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