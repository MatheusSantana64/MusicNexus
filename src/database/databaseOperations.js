// This file contains functions to interact with the SQLite database.
// It includes functions to fetch songs, delete cache, delete data, fetch all songs as JSON, insert a single song into the database, delete the cover image for a song, delete a song from the database, submit form data, and add another song from the same album.

import { db, initDatabase } from '../database/databaseSetup';
import { deleteImageFromCache, generateCacheKey } from '../utils/cacheManager';

// Helper function to execute SQL queries
const executeSql = (query, params = []) => {
    return new Promise((resolve, reject) => {
        db.transaction(tx => {
            tx.executeSql(
                query,
                params,
                (_, result) => resolve(result),
                (_, error) => {
                    console.error(`Error executing query: ${query}`, error);
                    reject(error);
                }
            );
        }, (transactionError) => {
            console.error('Transaction error:', transactionError);
            reject(transactionError);
        });
    });
};

// Function to fetch songs from the SQLite database with dynamic query and pagination
export const fetchSongs = async (searchText, orderBy, orderDirection, offset = 0, isScroll = false, ratingRange = { min: 0, max: 10 }) => {
    let query = 'SELECT * FROM songs';
    const params = [];
    const conditions = [];

    // Split search text into individual words
    const searchWords = searchText.trim().split(/\s+/);

    // Add conditions for search text
    if (searchWords.length > 0 && searchWords[0] !== '') {
        const searchConditions = searchWords.map(() => `(title LIKE ? OR artist LIKE ? OR album LIKE ?)`).join(' AND ');
        conditions.push(searchConditions);
        searchWords.forEach(word => {
            const keyword = `%${word}%`;
            params.push(keyword, keyword, keyword);
        });
    }

    // Add conditions for rating range
    if (ratingRange.min !== 0 || ratingRange.max !== 10) {
        conditions.push('rating >= ? AND rating <= ?');
        params.push(ratingRange.min, ratingRange.max);
    }

    // Combine conditions
    if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
    }

    // Add ORDER BY clause
    const orderColumns = ['rating', 'release'].includes(orderBy)
        ? `${orderBy} ${orderDirection}, LOWER(artist) ASC, LOWER(album) ASC, LOWER(title) ASC`
        : `LOWER(${orderBy}) ${orderDirection}, LOWER(artist) ASC, LOWER(album) ASC, LOWER(title) ASC`;
    query += ` ORDER BY ${orderColumns}`;

    // Add LIMIT and OFFSET clauses
    query += ' LIMIT 100 OFFSET ?';
    params.push(offset);

    const result = await executeSql(query, params);
    return result.rows._array;
};

// Function to get the total number of songs
export const getTotalSongs = async () => {
    const result = await executeSql('SELECT COUNT(*) as total FROM songs');
    return result.rows._array[0].total;
};

// Function to get the total number of artists
export const getTotalArtists = async () => {
    const result = await executeSql('SELECT COUNT(DISTINCT artist) as total FROM songs');
    return result.rows._array[0].total;
};

// Function to get the total number of albums
export const getTotalAlbums = async () => {
    const result = await executeSql('SELECT COUNT(DISTINCT album) as total FROM songs');
    return result.rows._array[0].total;
};

// Function to get the count of songs for each rating
export const getSongsCountByRating = async () => {
    const allRatings = Array.from({ length: 21 }, (_, i) => 10 - i * 0.5);
    const ratingCounts = Object.fromEntries(allRatings.map(rating => [rating, 0]));

    const result = await executeSql('SELECT rating, COUNT(*) as count FROM songs GROUP BY rating');
    result.rows._array.forEach(row => {
        ratingCounts[row.rating] = row.count;
    });

    return Object.entries(ratingCounts)
        .map(([rating, count]) => ({ rating: parseFloat(rating), count }))
        .sort((a, b) => b.rating - a.rating);
};

// Function to get the count of songs for each year
export const getSongsCountByYear = async () => {
    const result = await executeSql(
        `SELECT strftime("%Y", release) as year, COUNT(*) as count 
         FROM songs 
         WHERE strftime("%Y", release) NOT LIKE "-%" 
         GROUP BY year 
         ORDER BY year DESC`
    );
    return result.rows._array;
};

// Function to fetch all songs from the database and return them as a JSON array
export const fetchAllSongsAsJson = async () => {
    const result = await executeSql('SELECT id, title, artist, album, release, rating FROM songs');
    const songs = result.rows._array;

    const songsWithRatingHistory = await Promise.all(songs.map(async (song) => {
        const ratingHistory = await getSongRatingHistory(song.id);
        return { ...song, ratingHistory };
    }));

    return songsWithRatingHistory;
};

// Function to insert a song into the database and return the inserted ID
export const insertSongIntoDatabase = async (song) => {
    const { id, title, artist, album, release, rating, cover_path } = song;
    const result = await executeSql(
        `INSERT INTO songs (id, title, artist, album, release, rating, cover_path)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
         title=excluded.title, artist=excluded.artist, album=excluded.album, release=excluded.release, rating=excluded.rating, cover_path=excluded.cover_path`,
        [id, title, artist, album, release, rating, cover_path || null]
    );
    return result.insertId;
};

// Function to fetch all albums without a cover
export const fetchAlbumsWithoutCover = async () => {
    const result = await executeSql(
        `SELECT DISTINCT artist, album
         FROM songs
         WHERE cover_path IS NULL
         ORDER BY album ASC`
    );
    return result.rows._array;
};

// Function to handle the deletion of all songs in the database
export const deleteData = async () => {
    await executeSql('DROP TABLE IF EXISTS songs');
    await executeSql('DROP TABLE IF EXISTS song_rating_history');
    await executeSql('DROP TABLE IF EXISTS tags');
    await executeSql('DROP TABLE IF EXISTS song_tags');
    console.log('Data deleted.');
    initDatabase();
};

// Function to delete the cache and update cover_path of all songs to null
export const coverPathToNull = async () => {
    await executeSql('UPDATE songs SET cover_path = NULL');
    console.log('Cover paths updated to null.');
};

// Function to update the cover_path of a song in the database
export const updateSongCoverPath = async (songId, coverPath) => {
    await executeSql('UPDATE songs SET cover_path = ? WHERE id = ?', [coverPath, songId]);
    console.log(`Cover path updated for song with ID: ${songId}`);
};

// Function to insert a rating history record
export const insertRatingHistory = async (songId, rating, previous_rating, datetime = new Date().toISOString()) => {
    await executeSql(
        'INSERT INTO song_rating_history (song_id, rating, previous_rating, datetime) VALUES (?, ?, ?, ?)',
        [songId, rating, previous_rating, datetime]
    );
};

// Function to update the rating of a song in the database
export const updateSongRating = async (songId, rating, previousRating) => {
    await executeSql('UPDATE songs SET rating = ? WHERE id = ?', [rating, songId]);
    await insertRatingHistory(songId, rating, previousRating);
    console.log(`Song rating updated for song with ID: ${songId}, New Rating: ${rating}`);
};

// Function to fetch the rating history of a song
export const getSongRatingHistory = async (songId) => {
    const result = await executeSql(
        'SELECT rating, previous_rating, datetime FROM song_rating_history WHERE song_id = ? ORDER BY datetime DESC',
        [songId]
    );
    return result.rows._array;
};

// Function to fetch global rating history
export const fetchGlobalRatingHistory = async (offset = 0) => {
    const result = await executeSql(
        `SELECT
            song_rating_history.song_id,
            songs.title,
            songs.artist,
            songs.album,
            songs.cover_path,
            song_rating_history.rating AS rating,
            song_rating_history.datetime AS datetime,
            song_rating_history.previous_rating AS previous_rating
         FROM
            song_rating_history
         INNER JOIN
            songs ON songs.id = song_rating_history.song_id
         ORDER BY
            song_rating_history.datetime DESC
         LIMIT 50 OFFSET ?`,
        [offset]
    );
    return result.rows._array;
};

// Function to delete the cover image for a song and update the database
export const deleteCover = async (artist, album) => {
    const cacheKey = generateCacheKey(artist, album);
    await deleteImageFromCache(cacheKey);
    await executeSql('UPDATE songs SET cover_path = NULL WHERE artist = ? AND album = ?', [artist, album]);
};

// Function to delete a song from the database
export const deleteSong = async (songId) => {
    await executeSql('DELETE FROM songs WHERE id = ?', [songId]);
};

// Function to handle the form submission for adding or editing a song
export const submitForm = async (song, editMode) => {
    const title = (typeof song.title === 'string' ? song.title : "Unknown Title").replace(/'/g, "''");
    const artist = (typeof song.artist === 'string' ? song.artist : "Unknown Artist").replace(/'/g, "''");
    const album = (typeof song.album === 'string' ? song.album : "Unknown Album").replace(/'/g, "''");
    const release = song.release || "1900-01-01";
    const rating = song.rating || 0;

    if (editMode) {
        await executeSql(
            `UPDATE songs SET title = ?, artist = ?, album = ?, release = ?, rating = ? WHERE id = ?`,
            [title, artist, album, release, rating, song.id]
        );
    } else {
        await executeSql(
            `INSERT INTO songs (title, artist, album, release, rating) VALUES (?, ?, ?, ?, ?)`,
            [title, artist, album, release, rating]
        );
    }
};

// Function to insert a new tag into the database
export const insertTag = async (tag) => {
    await executeSql('INSERT INTO tags (name, color) VALUES (?, ?)', [tag.name, tag.color]);
};

// Function to add a tag to a song
export const addTag = async (songId, tagId) => {
    await executeSql('INSERT INTO song_tags (song_id, tag_id) VALUES (?, ?)', [songId, tagId]);
};

// Function to select all tags
export const getTags = async () => {
    const result = await executeSql('SELECT * FROM tags');
    return result.rows._array;
};

// Function to select all tag IDs for a song
export const getTagsFromSongTags = async (songId) => {
    const result = await executeSql('SELECT tag_id FROM song_tags WHERE song_id = ?', [songId]);
    return result.rows._array;
};

// Function to select all tags for a song, returning the tag name and color
export const getTagsForSong = async (songId) => {
    const result = await executeSql(
        `SELECT tags.name, tags.color 
         FROM tags 
         INNER JOIN song_tags ON tags.id = song_tags.tag_id 
         WHERE song_tags.song_id = ?`,
        [songId]
    );
    return result.rows._array;
};

// Function to remove a tag from a song
export const removeTag = async (songId, tagId) => {
    await executeSql('DELETE FROM song_tags WHERE song_id = ? AND tag_id = ?', [songId, tagId]);
};

// Function to delete a tag from the database
export const deleteTag = async (tagId) => {
    await executeSql('DELETE FROM tags WHERE id = ?', [tagId]);
};

// Function to get a tag by ID
export const getTagById = async (tagId) => {
    const result = await executeSql('SELECT * FROM tags WHERE id = ?', [tagId]);
    return result.rows._array.length > 0 ? result.rows._array[0] : null;
};

// Function to update a tag
export const updateTag = async (tagId, updatedTagData) => {
    await executeSql('UPDATE tags SET name = ?, color = ? WHERE id = ?', [updatedTagData.name, updatedTagData.color, tagId]);
};

// Function to fetch all data from the database
export const fetchAllDataAsJson = async () => {
    const songsResult = await executeSql('SELECT * FROM songs');
    const songs = songsResult.rows._array;

    const ratingHistoryResult = await executeSql('SELECT * FROM song_rating_history');
    const ratingHistory = ratingHistoryResult.rows._array;

    const tagsResult = await executeSql('SELECT * FROM tags');
    const tags = tagsResult.rows._array;

    const songTagsResult = await executeSql('SELECT * FROM song_tags');
    const songTags = songTagsResult.rows._array;

    return { songs, ratingHistory, tags, songTags };
};

// Function to insert all data into the database
// Function to insert all data into the database
export const insertAllDataIntoDatabase = async (data) => {
    const { songs, ratingHistory, tags, songTags } = data;

    // Insert songs
    for (const song of songs) {
        await insertSongIntoDatabase(song);
    }

    // Insert rating history
    for (const history of ratingHistory) {
        await insertRatingHistory(history.song_id, history.rating, history.previous_rating, history.datetime);
    }

    // Insert tags
    for (const tag of tags) {
        await insertTag(tag);
    }

    // Insert song tags
    for (const songTag of songTags) {
        await addTag(songTag.song_id, songTag.tag_id);
    }
};