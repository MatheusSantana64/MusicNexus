import { StyleSheet } from 'react-native';
import { globalStyles } from './global';
import { Dimensions } from 'react-native';

export const cardStyles = StyleSheet.create({
    cardContainer: {
        flexDirection: 'row',
        borderRadius: 8,
        paddingRight: 5,
        marginBottom: 5,
        width: '100%',
        height: 'auto',
    },
    image: {
        width: globalStyles.coverSize,
        height: globalStyles.coverSize,
        borderRadius: 5,
        marginRight: 10,
        marginLeft: 10,
        marginVertical: 5,
        alignSelf: 'center',
    },
    songInfoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        maxWidth: '58%',
    },
    songInfoTextContainer: {
        flex: 1,
        marginRight: 10,
    },
    songInfoText: {
        color: 'white',
        fontSize: 10,
        flexWrap: 'wrap',
        width: '100%',
        fontFamily: globalStyles.defaultFont,
    },
    songTitle: {
        color: 'white',
        fontSize: 13,
        flexWrap: 'wrap',
        fontWeight: 'bold',
        fontFamily: globalStyles.defaultFont,
    },
    ratingAndEditContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    ratingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'start',
    },
    ratingText: {
        color: 'white',
        fontSize: 14,
        fontWeight: 'bold',
        flexWrap: 'wrap',
        width: '60%',
        textAlign: 'center',
        fontFamily: globalStyles.defaultFont,
    },
    tagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 2,
        marginBottom: 2,
    },
    tagItem: {
        borderRadius: 20,
        paddingHorizontal: 5,
        paddingVertical: 1,
        marginRight: 3,
        marginBottom: 3,
    },
    tagText: {
        color: 'white',
        textAlign: 'center',
        fontSize: 10,
        fontFamily: globalStyles.defaultFont,
    },
});

export const colorPickerStyles = StyleSheet.create({
    container: {
        flex: 1,
    },
    modalContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    colorPicker: {
        width: '90%',
        alignSelf: 'center',
        marginBottom: 50,
        marginTop: 150,
    },
    saveButton: {
        marginTop: 20,
        padding: 10,
        width: '50%',
        alignSelf: 'center',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: 'grey',
    },
    saveButtonText: {
        color: 'white',
        textAlign: 'center',
    },
});

export const discoverSongCardStyles = StyleSheet.create({
    songItem: {
        flexDirection: 'row',
        backgroundColor: globalStyles.defaultBackgroundColor,
        borderRadius: 8,
        padding: 4,
        marginBottom: 6,
        alignItems: 'center',
    },
    coverImage: {
        width: 60,
        height: 60,
        borderRadius: 5,
        marginRight: 10,
    },
    coverPlaceholder: {
        width: 60,
        height: 60,
        borderRadius: 5,
        marginRight: 10,
        backgroundColor: globalStyles.gray2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    noCoverPlaceholder: {
        backgroundColor: globalStyles.red2,
    },
    noCoverText: {
        color: 'white',
        fontSize: 12,
        textAlign: 'center',
    },
    songInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    songTitle: {
        color: 'white',
        fontSize: 14,
        fontWeight: 'bold',
    },
    songArtist: {
        color: 'lightgrey',
        fontSize: 12,
        fontWeight: 'bold',
    },
    songAlbum: {
        color: 'lightgrey',
        fontSize: 10,
    },
    songTrackNumber: {
        color: 'grey',
        fontSize: 9,
    },
    songReleaseDate: {
        color: 'grey',
        fontSize: 10,
    },
    addButton: {
        marginRight: 10,
        borderRadius: 8,
        padding: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    addButtonText: {
        color: 'white',
        fontSize: 14,
    },
});

export const editTagModalStyles = StyleSheet.create({
    modalContent: {
        backgroundColor: globalStyles.modalBackgroundColor,
        padding: 22,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 4,
    },
    title: {
        fontSize: 20,
        marginBottom: 12,
        color: 'white',
    },
    inputText: {
        color: 'white',
        height: 40,
        borderColor: 'gray',
        borderWidth: 1,
        borderRadius: 5,
        width: '80%',
        marginBottom: 10,
        paddingLeft: 10,
    },
    button: {
        padding: 10,
        borderRadius: 5,
        alignSelf: 'center',
        marginBottom: 10,
    },
    saveButton: {
        backgroundColor: 'darkgreen',
    },
    saveButtonText: {
        color: 'white',
    },
});

export const orderButtonsStyles = StyleSheet.create({
    orderButtonsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    orderButton: {
        marginLeft: 16,
    },
    orderDirectionButton: {
        marginLeft: 10,
    },
});

export const ratingModalStyles = StyleSheet.create({
    modalStyle: {
        margin: 0,
        width: '100%',
        alignItems: 'center',
    },
    modalContainer: {
        backgroundColor: globalStyles.modalBackgroundColor,
        borderRadius: 10,
        padding: 16,
        paddingVertical: 0,
        width: '95%',
        maxHeight: '100%',
    },
    submitButton: {
        backgroundColor: globalStyles.defaultButtonColor,
        borderRadius: 8,
        padding: 10,
        marginTop: 20,
        marginBottom: 10,
        justifyContent: 'center',
    },
    submitText: {
        color: 'white',
        textAlign: 'center',
    },
    tagsContent: {
        backgroundColor: globalStyles.modalBackgroundColor,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 4,
        maxHeight: '70%',
        marginVertical: 20,
        width: '100%',
    },
    title: {
        fontSize: 20,
        marginBottom: 12,
        color: 'white',
        fontWeight: 'bold',
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 20,
        marginBottom: 0,
        color: 'white',
    },
    checkboxStyle: {
        borderRadius: 5,
        marginTop: 10,
    },
    tagButton: {
        color: 'white',
        marginHorizontal: 10,
        marginTop: 10,
        padding: 5,
        borderRadius: 20,
        justifyContent: 'center',
        flex: 1,
    },
    tagText: {
        color: 'white',
        textAlign: 'center',
    },
    tagContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
    },
});

export const searchBarStyles = StyleSheet.create({
    container: {
        flexDirection: 'column',
        marginBottom: 16,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '70%',
    },
    input: {
        backgroundColor: globalStyles.gray1,
        borderRadius: 8,
        color: 'white',
        height: 32,
        paddingHorizontal: 16,
        paddingRight: 40,
        width: '100%',
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
        right: 4,
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
    tagButton: {
        borderRadius: 8,
        padding: 8,
        marginVertical: 5,
        backgroundColor: globalStyles.gray2,
        width: '100%',
        alignItems: 'center',
    },
    selectedTagButton: {
        backgroundColor: globalStyles.blue2,
    },
});

export const searchBarAdvStyles = StyleSheet.create({
    searchBarContainer: {
        marginVertical: 10,
        backgroundColor: globalStyles.gray1,
        borderRadius: 8,
        padding: 5,
        paddingHorizontal: 10,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 3,
    },
    input: {
        color: 'white',
        fontSize: 18,
        height: 40,
        flex: 1,
        paddingHorizontal: 10,
        backgroundColor: globalStyles.gray2,
        borderRadius: 8,
        paddingRight: 40,
    },
    clearButton: {
        position: 'absolute',
        right: 10,
    },
    rowContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 3,
    },
    inputContainerHalf: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 5,
    },
    searchButtonHalf: {
        flex: 1,
        padding: 10,
        backgroundColor: globalStyles.blue2,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export const settingsModalStyles = StyleSheet.create({
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

export const songFormModalStyles = StyleSheet.create({
    absoluteContainer: {
        backgroundColor: '#090909',
        position: 'absolute',
        right: 0,
        bottom: 0,
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'flex-start', // Align to the top
        marginTop: 20,
        alignItems: 'center',
    },
    formContainer: {
        backgroundColor: globalStyles.modalBackgroundColor,
        borderRadius: 8,
        padding: 16,
        width: Dimensions.get('window').width * 0.8,
    },
    input: {
        backgroundColor: globalStyles.gray3,
        borderRadius: 8,
        color: 'white',
        height: 48,
        paddingHorizontal: 16,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: globalStyles.gray2,
        textAlignVertical: 'center',
    },
    buttonContainer: {
        borderRadius: 5,
        overflow: 'hidden',
    },
    marginTop: {
        marginTop: 5,
    },
});

export const songOptionsModalStyles = StyleSheet.create({
    fullScreenModal: {
        margin: 0,
        justifyContent: 'center',
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    optionsContainer: {
        backgroundColor: globalStyles.modalBackgroundColor,
        borderRadius: 8,
        padding: 16,
        width: '90%',
    },
    optionsTitle: {
        color: 'white',
        fontSize: 20,
        marginBottom: 2,
    },
    optionButton: {
        backgroundColor: globalStyles.blue2,
        borderRadius: 8,
        padding: 10,
        marginBottom: 16,
    },
    optionButtonSmall: {
        backgroundColor: globalStyles.green2,
        borderRadius: 8,
        padding: 5,
        width: '48%',
        justifyContent: 'center',
    },
    optionText: {
        color: 'white',
        textAlign: 'center',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
    },
    centeredView: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        marginTop: 22,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalView: {
        margin: 40,
        width: '80%',
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
        marginBottom: 10,
        textAlign: "center",
        color: 'white',
        fontSize: 16,
        borderColor: 'grey',
        borderWidth: 1,
        borderRadius: 8,
        padding: 5
    },
});

export const tagsListStyles = StyleSheet.create({
    tagContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 5,
      flex: 1,
      justifyContent: 'space-between',
    },
    tagButton: {
      padding: 4,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      flex: 1,
      marginLeft: 'auto',
    },
    tagText: {
      color: 'white',
      fontSize: 16,
    },
    actionButtons: {
      flexDirection: 'row',
      marginLeft: 'auto',
      alignItems: 'center',
      justifyContent: 'center',
    },
    moveButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: globalStyles.blue3,
      paddingVertical: 5,
      paddingHorizontal: 10,
      borderRadius: 15,
      marginLeft: 5,
    },
    deleteButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: globalStyles.red3,
      padding: 5,
      paddingHorizontal: 5,
      borderRadius: 15,
      marginRight: 5,
    },
    buttonText: {
      color: 'white',
      justifyContent: 'center',
      alignItems: 'center',
    },
    createTagContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 6,
      marginTop: 10,
    },
    input: {
      flex: 1,
      color: 'white',
      borderColor: 'gray',
      borderWidth: 1,
      borderRadius: 5,
      paddingVertical: 2,
      paddingHorizontal: 8,
      marginRight: 10,
    },
    colorButton: {
      padding: 8,
      borderRadius: 5,
      marginRight: 10,
    },
    createButton: {
      backgroundColor: globalStyles.green2,
      padding: 8,
      borderRadius: 5,
    },
});