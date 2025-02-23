// This file contains functions to interact with the SQLite database.
// It includes functions to fetch songs, delete cache, delete data, fetch all songs as JSON, insert a single song into the database, delete the cover image for a song, delete a song from the database, submit form data, and add another song from the same album.

import { db, initDatabase, initializeTagPositions } from '../database/databaseSetup';
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
export const fetchSongs = async (searchText, orderBy, orderDirection, offset = 0, isScroll = false, ratingRange = { min: 0, max: 10 }, tagFilter = []) => {
    let query = 'SELECT songs.* FROM songs';
    const params = [];
    const conditions = [];

    // Join with song_tags for each tag in tagFilter
    if (tagFilter.length > 0) {
        tagFilter.forEach((tagId, index) => {
            query += ` INNER JOIN song_tags AS st${index} ON songs.id = st${index}.song_id AND st${index}.tag_id = ?`;
            params.push(tagId);
        });
    }

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

// Function to get tags with their associated song count
export const getTagsWithSongCount = async () => {
    const result = await executeSql(
        `SELECT tags.name, COUNT(song_tags.song_id) as count
         FROM tags
         LEFT JOIN song_tags ON tags.id = song_tags.tag_id
         GROUP BY tags.id
         ORDER BY tags.position`
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
    console.log('databaseOperations.js:191 (', songId, '-', coverPath, ') updateSongCoverPath');
    await executeSql('UPDATE songs SET cover_path = ? WHERE id = ?', [coverPath, songId]);
    console.log('databaseOperations.js:191 (', songId, '-', coverPath, ') cover path updated');
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
    // Get the current maximum position
    const result = await executeSql('SELECT MAX(position) as maxPosition FROM tags');
    const maxPosition = result.rows.item(0).maxPosition || 0;

    // Insert the new tag with the position set to maxPosition + 1
    await executeSql('INSERT INTO tags (name, color, position) VALUES (?, ?, ?)', [tag.name, tag.color, maxPosition + 1]);
};

// Function to add a tag to a song
export const addTag = async (songId, tagId) => {
    await executeSql('INSERT INTO song_tags (song_id, tag_id) VALUES (?, ?)', [songId, tagId]);
};

// Function to select all tags
export const getTags = async () => {
    const result = await executeSql('SELECT * FROM tags ORDER BY position');
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
         WHERE song_tags.song_id = ?
         ORDER BY tags.position`,
        [songId]
    );
    return result.rows._array;
};

// Function to remove a tag from a song
export const removeTag = async (songId, tagId) => {
    await executeSql('DELETE FROM song_tags WHERE song_id = ? AND tag_id = ?', [songId, tagId]);
};

// Function to delete a tag from the database and update positions
export const deleteTag = async (tagId) => {
    // Get the position of the tag to be deleted
    const tagToDelete = await executeSql('SELECT position FROM tags WHERE id = ?', [tagId]);
    if (tagToDelete.rows.length === 0) {
        return;
    }

    const positionToDelete = tagToDelete.rows.item(0).position;

    // Delete the tag
    await executeSql('DELETE FROM tags WHERE id = ?', [tagId]);

    // Update positions of remaining tags
    await updateTagPositions(positionToDelete);
};

// Function to update positions of remaining tags after a deletion
const updateTagPositions = async (deletedPosition) => {
    // Decrease the position of all tags with a position greater than the deleted position
    await executeSql('UPDATE tags SET position = position - 1 WHERE position > ?', [deletedPosition]);
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
export const insertAllDataIntoDatabase = async (data, progressCallback) => {
    const { songs, ratingHistory, tags, songTags } = data;

    // Insert songs
    for (let i = 0; i < songs.length; i++) {
        await insertSongIntoDatabase(songs[i]);
        progressCallback(i + 1, songs.length);
    }

    // Insert rating history
    for (let i = 0; i < ratingHistory.length; i++) {
        await insertRatingHistory(ratingHistory[i].song_id, ratingHistory[i].rating, ratingHistory[i].previous_rating, ratingHistory[i].datetime);
    }

    // Insert tags with default position if missing
    for (let i = 0; i < tags.length; i++) {
        const tag = tags[i];
        if (tag.position === undefined) {
            tag.position = i; // Assign a default position based on the order
        }
        await insertTag(tag);
    }

    // Insert song tags
    for (let i = 0; i < songTags.length; i++) {
        await addTag(songTags[i].song_id, songTags[i].tag_id);
    }

    // Ensure positions are set correctly for all tags
    await initializeTagPositions();
};

// Function to clear all data from the database
export const clearDatabase = async () => {
    await executeSql('DELETE FROM songs');
    await executeSql('DELETE FROM song_rating_history');
    await executeSql('DELETE FROM tags');
    await executeSql('DELETE FROM song_tags');
    console.log('Database cleared.');
};

// Function to move a tag up
export const moveTagUp = async (tagId) => {
    // Get the current position of the tag
    const currentTag = await executeSql('SELECT id, position FROM tags WHERE id = ?', [tagId]);
    if (currentTag.rows.length === 0) {
        return;
    }

    const currentPosition = currentTag.rows.item(0).position;

    // Find the tag that is currently above the current tag
    const aboveTag = await executeSql('SELECT id, position FROM tags WHERE position = ?', [currentPosition - 1]);
    if (aboveTag.rows.length === 0) {
        return;
    }

    const aboveTagId = aboveTag.rows.item(0).id;

    // Swap positions
    await executeSql('UPDATE tags SET position = ? WHERE id = ?', [currentPosition - 1, tagId]);
    await executeSql('UPDATE tags SET position = ? WHERE id = ?', [currentPosition, aboveTagId]);
};

// Function to move a tag down
export const moveTagDown = async (tagId) => {
    // Get the current position of the tag
    const currentTag = await executeSql('SELECT id, position FROM tags WHERE id = ?', [tagId]);
    if (currentTag.rows.length === 0) {
        return;
    }

    const currentPosition = currentTag.rows.item(0).position;

    // Find the tag that is currently below the current tag
    const belowTag = await executeSql('SELECT id, position FROM tags WHERE position = ?', [currentPosition + 1]);
    if (belowTag.rows.length === 0) {
        return;
    }

    const belowTagId = belowTag.rows.item(0).id;

    // Swap positions
    await executeSql('UPDATE tags SET position = ? WHERE id = ?', [currentPosition + 1, tagId]);
    await executeSql('UPDATE tags SET position = ? WHERE id = ?', [currentPosition, belowTagId]);
};

// Function to check if a string is a substring of another string (case insensitive)
const isSubstring = (str1, str2) => {
    return str1.toLowerCase().includes(str2.toLowerCase()) || str2.toLowerCase().includes(str1.toLowerCase());
};

// Function to check if a song exists in the database with flexible comparison
export const songExistsInDatabase = async (title, artist, album) => {
    const result = await executeSql(
        'SELECT title, artist, album FROM songs WHERE LOWER(artist) = LOWER(?)',
        [artist]
    );

    for (let i = 0; i < result.rows.length; i++) {
        const row = result.rows.item(i);
        const titleMatch = row.title.toLowerCase() === title.toLowerCase();
        const albumMatch = isSubstring(row.album, album);

        // Consider the song exists if the title matches exactly and the album is a substring match
        if (titleMatch && albumMatch) {
            return true;
        }
    }

    return false;
};