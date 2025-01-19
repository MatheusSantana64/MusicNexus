import { StyleSheet } from 'react-native';
import { globalStyles } from './global';

export const discoverScreenStyles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: globalStyles.defaultBackgroundColor,
    },
    listContainer: {
        paddingBottom: 10,
    },
    loadingText: {
        color: 'white',
        textAlign: 'center',
        marginTop: 20,
    },
    noResultsText: {
        color: 'white',
        textAlign: 'center',
        marginTop: 20,
    },
});

export const historyScreenStyles = StyleSheet.create({
    container: {
        paddingTop: 20,
        paddingHorizontal: 20,
        backgroundColor: 'black',
        height: '100%',
    },
    pageTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
        color: 'white',
        textAlign: 'center',
    },
    cardContainer: {
        flexDirection: 'row',
        backgroundColor: globalStyles.defaultBackgroundColor,
        borderRadius: 8,
        paddingRight: 10,
        marginBottom: 5,
        width: '100%',
        height: 'auto',
    },
    coverImage: {
        width: globalStyles.coverSize,
        height: globalStyles.coverSize,
        alignSelf: 'center',
        marginRight: 0,
        borderRadius: 5,
    },
    songInfoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginLeft: 10,
    },
    songInfoColumn: {
        flexDirection: 'column',
    },
    songTitle: {
        fontSize: 14,
        color: 'white',
    },
    songInfo: {
        color: 'white',
        fontSize: 10,
        flexWrap: 'wrap',
    },
    ratingAndEditContainer: {
        flexDirection: 'column',
        justifyContent: 'flex-end',
        alignItems: 'center',
        marginHorizontal: 5,
        marginBottom: 5,
    },
    ratingText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    previousRating: {
        color: 'lightcoral',
    },
    currentRating: {
        color: 'lightgreen',
    },
    updateTime: {
        fontSize: 12,
        color: 'white',
    },
});

export const homeScreenStyles = StyleSheet.create({
    title: {
        fontSize: 24,
        color: 'white',
    },
    titleContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginVertical: 12,
    },
    screen: {
        flex: 1,
        backgroundColor: globalStyles.defaultBackgroundColor,
        paddingTop: 4,
        paddingHorizontal: 5,
    },
    sectionContainer: {
        flex: 1,
        borderBottomWidth: 1,
        borderBottomColor: globalStyles.gray2,
    },
});

export const musicScreenStyles = StyleSheet.create({
    buttonContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        position: 'absolute',
        top: 16,
        right: 16,
        zIndex: 1,
    },
    refreshButton: {
        marginRight: 10,
        backgroundColor: globalStyles.blue1,
        paddingHorizontal: 6,
        borderRadius: 5,
        height: 40,
        width: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    floatingButton: {
        backgroundColor: globalStyles.green1,
        paddingHorizontal: 6,
        borderRadius: 5,
        height: 40,
        width: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export const profileScreenStyles = StyleSheet.create({
    stats: {
        width: '100%',
        flex: 1,
        borderBottomWidth: 1,
        borderBottomColor: globalStyles.gray2,
    },
    title: {
        color: 'white',
        fontSize: 24,
        marginBottom: 12,
        textAlign: 'left',
    },
    statsSubTitle: {
        color: 'white',
        fontSize: 20,
        marginTop: 4,
        marginBottom: 2,
        textAlign: 'left',
        fontWeight: 'bold',
    },
    statsText: {
        color: 'white',
        fontSize: 16,
        marginBottom: 4,
        textAlign: 'left',
        fontWeight: 'bold',
    },
    notesContainer: {
        paddingHorizontal: 10,
        alignItems: 'flex-start',
        justifyContent: 'flex-end',
        backgroundColor: globalStyles.defaultBackgroundColor,
        paddingBottom: 10,
        maxHeight: '50%',
    },
    notesInput: {
        //backgroundColor: globalStyles.modalBackgroundColor,
        borderRadius: 5,
        color: 'white',
        fontSize: 16,
        maxHeight: '80%',
        width: '100%',
        textAlignVertical: 'bottom',
    },
});

export const tagsScreenStyles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: globalStyles.defaultBackgroundColor,
        paddingTop: 4,
        paddingHorizontal: 5,
    },
    title: {
        fontSize: 24,
        color: 'white',
    },
});