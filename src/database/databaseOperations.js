// This file contains functions to interact with the SQLite database.
// It includes functions to fetch songs, delete cache, delete data, fetch all songs as JSON, insert a single song into the database, delete the cover image for a song, delete a song from the database, submit form data, and add another song from the same album.

import { db, initDatabase } from '../database/databaseSetup';
import { deleteAllFilesFromCache, deleteImageFromCache, generateCacheKey } from '../utils/cacheManager';

// Music.js
    // Function to fetch songs from the SQLite database with dynamic query and pagination
    export const fetchSongs = async (searchText, orderBy, orderDirection, offset = 0, isScroll = false, ratingRange = { min: 0, max: 10 }) => {
        let query = 'SELECT * FROM songs';
        let params = [];

        // Split search text into individual words
        const searchWords = searchText.split(' ');

        // Add WHERE clause for search text
        if (searchWords.length > 0) {
            query += ' WHERE ';
            const conditions = searchWords.map((word, index) => {
                params.push(`%${word}%`, `%${word}%`, `%${word}%`);
                return `(title LIKE ? OR artist LIKE ? OR album LIKE ?)`;
            }).join(' AND ');
            query += conditions;
        }

        // Add WHERE clause for rating range
        if (ratingRange.min !== 0 || ratingRange.max !== 10) {
            query += ' AND rating >= ? AND rating <= ?';
            params.push(ratingRange.min, ratingRange.max);
        }

        // Add ORDER BY clause
        query += ' ORDER BY ' + orderBy + ' ' + orderDirection + ', title ASC';

        // Add LIMIT and OFFSET clauses
        query += ' LIMIT 100 OFFSET ?';
        params.push(offset);

        // Execute the SQL query
        const songs = await new Promise((resolve, reject) => {
            db.transaction(tx => {
                tx.executeSql(
                    query,
                    params,
                    (_, { rows: { _array } }) => {
                        resolve(_array);
                    },
                    (_, error) => {
                        console.error('Error fetching songs:', error);
                        reject(error);
                    }
                );
            });
        });

        return songs;
    };

// Profile.js
    // Function to delete the cache and update cover_path of all songs to null
    export const deleteCache = async () => {
        try {
            // Delete all files in the cache directory
            await deleteAllFilesFromCache();

            // Update cover_path of all songs to null
            await new Promise((resolve, reject) => {
                db.transaction(tx => {
                    tx.executeSql('UPDATE songs SET cover_path = ?', [null], () => {
                        console.log('Cover paths updated to null.');
                        resolve();
                    }, (_, error) => {
                        console.error('Error updating cover paths:', error);
                        reject(error);
                    });
                });
            });
            console.log('All files in the cache have been deleted and cover paths updated to null.');
        } catch (error) {
            console.error('Error deleting cache:', error);
        }
    };

    // Function to handle the deletion of all songs in the database
    export const deleteData = async () => {
        try {
            await new Promise((resolve, reject) => {
                db.transaction(tx => {
                    tx.executeSql('DROP TABLE IF EXISTS songs', [], () => {
                        tx.executeSql('DROP TABLE IF EXISTS tags', [], () => {
                            tx.executeSql('DROP TABLE IF EXISTS song_tags', [], () => {
                                resolve();
                            }, (_, error) => reject(error));
                        }, (_, error) => reject(error));
                    }, (_, error) => reject(error));
                });
            });
            console.log('Data deleted.');
            initDatabase(); // Recreate the tables
        } catch (error) {
            console.error('Error deleting data:', error);
        }
    };

    // Function to fetch all songs from the database and return them as a JSON string
    export const fetchAllSongsAsJson = async () => {
        try {
            const songs = await new Promise((resolve, reject) => {
                db.transaction(tx => {
                    tx.executeSql('SELECT * FROM songs', [], (_, { rows: { _array } }) => {
                        resolve(_array);
                    }, (_, error) => {
                        console.error('Error fetching songs:', error);
                        reject(error);
                    });
                });
            });
            return JSON.stringify(songs);
        } catch (error) {
            console.error('Error fetching songs for backup:', error);
            throw error;
        }
    };

    // Function to insert a single song into the database
    export const insertSongIntoDatabase = async (song) => {
        return new Promise((resolve, reject) => {
            db.transaction(tx => {
                const title = (typeof song.title === 'string' ? song.title : "Unknown Title").replace(/'/g, "''");
                const artist = (typeof song.artist === 'string' ? song.artist : "Unknown Artist").replace(/'/g, "''");
                const album = (typeof song.album === 'string' ? song.album : "Unknown Album").replace(/'/g, "''");
                const release = song.release || "1900-01-01";
                const rating = song.rating || 0;
                const sql = `INSERT INTO songs (title, artist, album, release, rating) VALUES ('${title}', '${artist}', '${album}', '${release}', ${rating})`;

                tx.executeSql(
                    sql,
                    [],
                    () => {
                        resolve();
                    },
                    (_, error) => {
                        reject(error);
                    }
                );
            });
        });
    };

// SongOptionsModal.js
    // Function to delete the cover image for a song and update the database
    export const deleteCover = async (artist, album) => {
        const cacheKey = generateCacheKey(artist, album);
        await deleteImageFromCache(cacheKey);
        return new Promise((resolve, reject) => {
            db.transaction(tx => {
                tx.executeSql(
                    'UPDATE songs SET cover_path = null WHERE artist = ? AND album = ?',
                    [artist, album],
                    () => {
                        resolve();
                    },
                    (_, error) => {
                        console.error('Error deleting cover:', error);
                        reject(error);
                    }
                );
            });
        });
    };

    // Function to delete a song from the database
    export const deleteSong = async (songId) => {
        return new Promise((resolve, reject) => {
            db.transaction(tx => {
                tx.executeSql(
                    'DELETE FROM songs WHERE id = ?',
                    [songId],
                    () => {
                        resolve();
                    },
                    (_, error) => {
                        console.error('Error deleting song:', error);
                        reject(error);
                    }
                );
            });
        });
    };

// SongFormModal.js
    // Function to handle the form submission for adding or editing a song
    export const submitForm = async (song, editMode) => {
        return new Promise((resolve, reject) => {
            db.transaction(tx => {
                const title = (typeof song.title === 'string' ? song.title : "Unknown Title").replace(/'/g, "''");
                const artist = (typeof song.artist === 'string' ? song.artist : "Unknown Artist").replace(/'/g, "''");
                const album = (typeof song.album === 'string' ? song.album : "Unknown Album").replace(/'/g, "''");
                const release = song.release || "1900-01-01";
                const rating = song.rating || 0;
                const sql = editMode ?
                    `UPDATE songs SET title = '${title}', artist = '${artist}', album = '${album}', release = '${release}', rating = ${rating} WHERE id = ${song.id}` :
                    `INSERT INTO songs (title, artist, album, release, rating) VALUES ('${title}', '${artist}', '${album}', '${release}', ${rating})`;
    
                console.log("SQL Query:", sql);
    
                tx.executeSql(
                    sql,
                    [],
                    () => {
                        resolve();
                    },
                    (_, error) => {
                        console.error('Error submitting form:', error);
                        reject(error);
                    }
                );
            });
        });
    };