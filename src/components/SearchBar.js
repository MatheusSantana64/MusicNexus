import React, { useState, useCallback, useEffect } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, Keyboard } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import Modal from 'react-native-modal';
import OrderButtons from './OrderButtons';
import { globalStyles } from '../styles/global';

const SearchBar = ({ setSearchText, setOrderBy, setOrderDirection, ratingRange, setRatingRange, showFilters = false }) => {
    const [inputText, setInputText] = useState('');
    const [order, setOrder] = useState('release');
    const [orderDirection, setOrderDirectionState] = useState('desc');
    const [modalVisible, setModalVisible] = useState(false);
    const [ratings, setRatings] = useState({ low: 0, high: 10 });

    const toggleModal = useCallback(() => {
        setModalVisible(!modalVisible);
    }, [modalVisible]);

    const handleEnterPress = useCallback(() => {
        setSearchText(inputText.trim());
        Keyboard.dismiss();
    }, [inputText, setSearchText]);

    const clearSearchInput = useCallback(() => {
        setInputText('');
        setSearchText('');
    }, [setSearchText]);

    const setBothRatings = useCallback((value) => {
        setRatings({ low: value, high: value });
    }, []);

    const updateLowRating = useCallback((value) => {
        setRatings((prev) => ({ ...prev, low: Math.max(0, Math.min(prev.high, value)) }));
    }, []);

    const updateHighRating = useCallback((value) => {
        setRatings((prev) => ({ ...prev, high: Math.max(prev.low, Math.min(10, value)) }));
    }, []);

    const applyRatings = useCallback(() => {
        toggleModal();
        setRatingRange({ min: ratings.low, max: ratings.high });
    }, [ratings, setRatingRange, toggleModal]);

    useEffect(() => {
        const handler = setTimeout(() => {
            setSearchText(inputText.trim());
        }, 500);

        return () => {
            clearTimeout(handler);
        };
    }, [inputText, setSearchText]);

    return (
        <View style={styles.container}>
            <View style={styles.inputContainer}>
                <TextInput
                    placeholder="Search"
                    placeholderTextColor='grey'
                    style={styles.input}
                    value={inputText}
                    onChangeText={setInputText}
                    onSubmitEditing={handleEnterPress}
                />
                {inputText && (
                    <TouchableOpacity onPress={clearSearchInput} style={styles.clearButton}>
                        <Icon name="x" size={30} color="white" />
                    </TouchableOpacity>
                )}
            </View>
            
            {showFilters && (
                <View style={styles.buttonsContainer}>
                    <TouchableOpacity onPress={toggleModal}>
                        <Text style={styles.filterText}>Rating: {ratingRange.min} ~ {ratingRange.max}</Text>
                    </TouchableOpacity>
                    
                    <Modal
                        isVisible={modalVisible}
                        onBackdropPress={toggleModal}
                        onBackButtonPress={toggleModal}
                        style={styles.modalContainer}
                        useNativeDriverForBackdrop={true}
                        hideModalContentWhileAnimating={true}
                        animationInTiming={100}
                        animationOutTiming={100}
                    >
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>Rating:</Text>
                            <RatingControls
                                low={ratings.low}
                                high={ratings.high}
                                updateLowRating={updateLowRating}
                                updateHighRating={updateHighRating}
                                setBothRatings={setBothRatings}
                            />
                            <RatingPresets setBothRatings={setBothRatings} />
                            <TouchableOpacity onPress={applyRatings} style={styles.applyButton}>
                                <Text style={styles.buttonText}>Apply</Text>
                            </TouchableOpacity>
                        </View>
                    </Modal>
                    
                    <OrderButtons
                        order={order}
                        setOrder={setOrder}
                        orderDirection={orderDirection}
                        setOrderDirection={setOrderDirectionState}
                        setMusicOrder={setOrderBy}
                        setMusicOrderDirection={setOrderDirection}
                    />
                </View>
            )}
        </View>
    );
};

const RatingControls = React.memo(({ low, high, updateLowRating, updateHighRating, setBothRatings }) => (
    <>
        <View style={styles.ratingContainer}>
            <View style={styles.ratingButtons}>
                <TouchableOpacity onPress={() => updateLowRating(low + 0.5)} style={styles.ratingButton}>
                    <Icon name="plus-circle" size={40} color="limegreen" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => updateLowRating(low - 0.5)} style={styles.ratingButton}>
                    <Icon name="minus-circle" size={40} color="crimson" />
                </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>
                {high === 10 ? `${low.toFixed(1)} ~ ${high}` : `${low.toFixed(1)} ~ ${high.toFixed(1)}`}
            </Text>
            <View style={styles.ratingButtons}>
                <TouchableOpacity onPress={() => updateHighRating(high + 0.5)} style={styles.ratingButton}>
                    <Icon name="plus-circle" size={40} color="limegreen" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => updateHighRating(high - 0.5)} style={styles.ratingButton}>
                    <Icon name="minus-circle" size={40} color="crimson" />
                </TouchableOpacity>
            </View>
        </View>
    </>
));

const RatingPresets = React.memo(({ setBothRatings }) => (
    <View style={styles.presetsContainer}>
        <View style={styles.buttonsRow}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
                <TouchableOpacity key={value} onPress={() => setBothRatings(value)} style={{ ...styles.button, paddingVertical: 5, backgroundColor: getColor(value) }}>
                    <Text style={styles.buttonText}>{value}</Text>
                </TouchableOpacity>
            ))}
        </View>
        <View style={styles.buttonsColumn}>
            <TouchableOpacity onPress={() => setBothRatings(0)} style={{ ...styles.button, marginTop: 10, backgroundColor: 'darkred', minWidth: 150 }}>
                <Text style={styles.buttonText}>Not Rated</Text>
                <Text style={{ ...styles.buttonText, fontSize: 12 }}>(0 ~ 0)</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setBothRatings(8)} style={{ ...styles.button, marginTop: 10, backgroundColor: 'darkgoldenrod', minWidth: 150 }}>
                <Text style={styles.buttonText}>Best Rated</Text>
                <Text style={{ ...styles.buttonText, fontSize: 12 }}>(8 ~ 10)</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setBothRatings(0)} style={{ ...styles.button, marginTop: 10, backgroundColor: 'darkgreen', minWidth: 150 }}>
                <Text style={styles.buttonText}>All Ratings</Text>
                <Text style={{ ...styles.buttonText, fontSize: 12 }}>Reset (0 ~ 10)</Text>
            </TouchableOpacity>
        </View>
    </View>
));

const getColor = (value) => {
    if (value <= 2) return 'darkred';
    if (value <= 4) return 'chocolate';
    if (value <= 6) return 'goldenrod';
    if (value <= 8) return 'darkgreen';
    return 'steelblue';
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'column',
        marginBottom: 16,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '90%',
    },
    input: {
        backgroundColor: globalStyles.gray1,
        borderRadius: 8,
        color: 'white',
        height: 32,
        paddingHorizontal: 16,
        paddingRight: 40,
        width: '80%',
        fontSize: 18,
        height: 40,
    },
    buttonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 16,
    },
    clearButton: {
        position: 'absolute',
        right: 10,
    },
    searchButton: {
        marginLeft: 10,
    },
    filterText: {
        color: 'white',
        marginRight: 8,
    },
    modalContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: globalStyles.gray1,
        padding: 20,
        borderRadius: 8,
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalTitle: {
        color: 'white',
        fontSize: 28,
    },
    modalSubtitle: {
        color: 'white',
        fontSize: 40,
        marginBottom: 16,
    },
    ratingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        marginBottom: 16,
    },
    ratingButtons: {
        flexDirection: 'column',
    },
    ratingButton: {
        paddingBottom: 10,
    },
    presetsContainer: {
        width: '100%',
    },
    buttonsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
    },
    buttonsColumn: {
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
    },
    button: {
        borderRadius: 8,
        padding: 8,
    },
    buttonText: {
        color: 'white',
        fontSize: 18,
        textAlign: 'center',
    },
    applyButton: {
        borderRadius: 8,
        padding: 8,
        marginTop: 10,
        backgroundColor: 'rebeccapurple',
        width: '100%',
    },
});

export default SearchBar;