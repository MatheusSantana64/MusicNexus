// This file provides functions to download an image from a URL and store it in the cache directory.
// It also provides functions to get an image from the cache directory, and delete an image from the cache directory.

import * as FileSystem from 'expo-file-system';
import { cleanAlbumName } from '../api/MusicBrainzAPI';

const cacheDirectory = FileSystem.cacheDirectory;

function generateCacheKey(artist, album) {
    album = cleanAlbumName(album);
    const key = `${artist.trim().toLowerCase()}${album.trim().toLowerCase()}`;
    //console.log(`Generated cache key for the album "${album}" by "${artist}" is: ${key.replace(/[^a-zA-Z0-9]/g, '')}`);
    return key.replace(/[^a-zA-Z0-9]/g, '');
}

const downloadImage = async (url, filename) => {
    const webpUrl = `${url}?format=webp`;
    const uri = `${cacheDirectory}${filename}`;
    try {
        const { uri: localUri } = await FileSystem.downloadAsync(webpUrl, uri);
        console.log(`Downloaded cover image for song: ${filename}`);
        return localUri;
    } catch (error) {
        console.error(`Failed to download cover image for song: ${filename}`, error);
        // Optionally, you can handle the error in a specific way, such as retrying the download or logging the error for debugging.
        return null; // Return null or handle the error as needed
    }
};

// Function to get an image from the cache directory
const getImageFromCache = async (filename) => {
    // Set the path of the image file in the cache directory
    const uri = `${cacheDirectory}${filename}`;
    // Check if the image file exists in the cache directory
    const { exists } = await FileSystem.getInfoAsync(uri);
    console.log(`Cover image exists in the cache for song: ${filename}: ${exists}. uri: ${uri}`);
    // Return the path of the image file if it exists, otherwise return null
    return exists ? uri : null;
};

const deleteImageFromCache = async (filename) => {
    const uri = `${cacheDirectory}${filename}`;
    const localCoverPath = await getImageFromCache(filename);
    if (localCoverPath) {
        await FileSystem.deleteAsync(uri);
        console.log(`Deleted cover image for song: ${filename}`);
    } else {
        console.log(`Cover image does not exist in the cache for song: ${filename}`);
    }
};

// Function to delete all files from the cache directory
const deleteAllFilesFromCache = async () => {
    const { exists, isDirectory } = await FileSystem.getInfoAsync(cacheDirectory);
    if (!exists || !isDirectory) {
        //console.log('Cache directory does not exist or is not a directory.');
        return;
    }

    const files = await FileSystem.readDirectoryAsync(cacheDirectory);
    for (const file of files) {
        const filePath = `${cacheDirectory}${file}`;
        await FileSystem.deleteAsync(filePath);
        //console.log(`Deleted file: ${filePath}`);
    }
    //console.log('All files deleted from the cache directory.');
};

export { downloadImage, getImageFromCache, deleteImageFromCache, deleteAllFilesFromCache, generateCacheKey };