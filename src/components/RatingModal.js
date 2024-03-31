import React, { useState, useEffect } from 'react';
import { Modal, View, TouchableOpacity, Text, TouchableWithoutFeedback } from 'react-native';
import { Rating } from 'react-native-ratings';

const RatingModal = ({ isVisible, onClose, onRatingSelect, selectedSong }) => {
    const [rating, setRating] = useState(0);

    // Reset rating to the current rating of the selected song or 0 if no song is selected
    useEffect(() => {
        setRating(selectedSong ? selectedSong.rating : 0);
    }, [selectedSong]);

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={isVisible}
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <TouchableWithoutFeedback onPress={() => {}}>
                        <View style={{ backgroundColor: '#1e272e', borderRadius: 8, padding: 16, width: '80%' }}>
                            <Rating
                                showRating
                                ratingCount={10} // Number of stars
                                fractions={1} // Allow half stars
                                jumpValue={0.5} // Only allow ratings in increments of 0.5
                                imageSize={30} // Size of the stars
                                tintColor='#1e272e' // Background color of the stars
                                startingValue={rating} // Set the initial rating as the current rating of the song
                                onFinishRating={(rating) => setRating(rating)} // Update the rating when the user selects a new rating
                            />
                            <TouchableOpacity onPress={() => onRatingSelect(rating)} style={{ backgroundColor: 'blue', borderRadius: 8, padding: 10, marginTop: 16 }}>
                                <Text style={{ color: 'white', textAlign: 'center' }}>Submit Rating</Text>
                            </TouchableOpacity>
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};

export default RatingModal;