// This file provides functions to download an image from a URL and store it in the cache directory.
// It also provides functions to get an image from the cache directory, and delete an image from the cache directory.

import * as FileSystem from 'expo-file-system';

const cacheDirectory = FileSystem.cacheDirectory;

const downloadImage = async (url, filename) => {
    const uri = `${cacheDirectory}${filename}`;
    const { uri: localUri } = await FileSystem.downloadAsync(url, uri);
    return localUri;
};

const getImageFromCache = async (filename) => {
    const uri = `${cacheDirectory}${filename}`;
    const { exists } = await FileSystem.getInfoAsync(uri);
    return exists ? uri : null;
};

const deleteImageFromCache = async (filename) => {
    const uri = `${cacheDirectory}${filename}`;
    await FileSystem.deleteAsync(uri);
};

export { downloadImage, getImageFromCache, deleteImageFromCache };