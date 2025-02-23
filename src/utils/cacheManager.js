import * as FileSystem from 'expo-file-system';
import { cleanAlbumName } from '../api/MusicBrainzAPI';

const { cacheDirectory } = FileSystem;

const normalizeString = (str) => {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
};

const generateCacheKey = (artist, album) => {
  const cleanedArtist = normalizeString(artist.trim().toLowerCase());
  const cleanedAlbum = normalizeString(cleanAlbumName(album).trim().toLowerCase());
  const key = `${cleanedArtist}${cleanedAlbum}`;
  return key.replace(/[^a-zA-Z0-9]/g, '');
};

const downloadImage = async (url, filename) => {
  if (!/^https?:\/\//i.test(url)) {
    console.error(`Invalid URL for filename: ${filename}. URL: ${url}`);
    return null;
  }

  const webpUrl = `${url}?format=webp`;
  const uri = `${cacheDirectory}${filename}`;

  try {
    const { uri: localUri } = await FileSystem.downloadAsync(webpUrl, uri);
    return localUri;
  } catch (error) {
    console.error(`Failed to download image: ${filename}`, error);
    return null;
  }
};

const getImageFromCache = async (filename) => {
  const uri = `${cacheDirectory}${filename}`;
  try {
    const fileInfo = await FileSystem.getInfoAsync(uri);
    return fileInfo.exists ? uri : null;
  } catch (error) {
    console.error(`Error accessing cache for ${filename}`, error);
    return null;
  }
};

const deleteImageFromCache = async (filename) => {
  const uri = `${cacheDirectory}${filename}`;
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch (error) {
    console.error(`Failed to delete image: ${filename}`, error);
  }
};

const deleteAllFilesFromCache = async () => {
  try {
    const { exists, isDirectory } = await FileSystem.getInfoAsync(cacheDirectory);
    if (!exists || !isDirectory) return;

    const files = await FileSystem.readDirectoryAsync(cacheDirectory);
    await Promise.all(files.map(file => FileSystem.deleteAsync(`${cacheDirectory}${file}`, { idempotent: true })));
  } catch (error) {
    console.error('Failed to clear cache directory.', error);
  }
};

export {
  downloadImage,
  getImageFromCache,
  deleteImageFromCache,
  deleteAllFilesFromCache,
  generateCacheKey
};