// This file contains functions to interact with the SQLite database.
// It includes functions to fetch songs, delete cache, delete data, fetch all songs as JSON, insert a single song into the database, delete the cover image for a song, delete a song from the database, submit form data, and add another song from the same album.

import { db, initDatabase } from '../database/databaseSetup';
import { deleteImageFromCache, generateCacheKey } from '../utils/cacheManager';

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
    // (Stats) Functions to get the total number of songs, total number of artists, and count of songs for each rating
        // Function to get the total number of songs
        export const getTotalSongs = async () => {
            return new Promise((resolve, reject) => {
                db.transaction(tx => {
                    tx.executeSql('SELECT COUNT(*) as total FROM songs', [], (_, { rows: { _array } }) => {
                        resolve(_array[0].total);
                    }, (_, error) => {
                        console.error('Error fetching total songs:', error);
                        reject(error);
                    });
                });
            });
        };

        // Function to get the total number of artists
        export const getTotalArtists = async () => {
            return new Promise((resolve, reject) => {
                db.transaction(tx => {
                    tx.executeSql('SELECT COUNT(DISTINCT artist) as total FROM songs', [], (_, { rows: { _array } }) => {
                        resolve(_array[0].total);
                    }, (_, error) => {
                        console.error('Error fetching total artists:', error);
                        reject(error);
                    });
                });
            });
        };

        // Function to get the total number of artists
        export const getTotalAlbums = async () => {
            return new Promise((resolve, reject) => {
                db.transaction(tx => {
                    tx.executeSql('SELECT COUNT(DISTINCT album) as total FROM songs', [], (_, { rows: { _array } }) => {
                        resolve(_array[0].total);
                    }, (_, error) => {
                        console.error('Error fetching total albums:', error);
                        reject(error);
                    });
                });
            });
        };
        
        // Function to get the count of songs for each rating, including ratings with 0 songs
        export const getSongsCountByRating = async () => {
            return new Promise((resolve, reject) => {
                // Generate an array of all possible ratings from 10.0 to 0.0 in decrements of 0.5
                const allRatings = Array.from({ length: 21 }, (_, i) => 10 - i * 0.5);

                // Initialize an object to hold the count of songs for each rating
                const ratingCounts = allRatings.reduce((acc, rating) => {
                    acc[rating] = 0; // Initialize count to 0 for each rating
                    return acc;
                }, {});

                db.transaction(tx => {
                    // SQL query to count songs for each rating
                    tx.executeSql('SELECT rating, COUNT(*) as count FROM songs GROUP BY rating ', [], (_, { rows: { _array } }) => {
                        // Update the ratingCounts object with the actual counts from the database
                        _array.forEach(row => {
                            ratingCounts[row.rating] = row.count;
                        });

                        // Convert the ratingCounts object back into an array of objects for consistency
                        let result = Object.entries(ratingCounts).map(([rating, count]) => ({
                            rating: parseFloat(rating), // Ensure rating is a number
                            count: count
                        }));

                        // Sort the result array by rating in descending order
                        result.sort((a, b) => b.rating - a.rating);

                        resolve(result);
                    }, (_, error) => {
                        console.error('Error fetching songs count by rating:', error);
                        reject(error);
                    });
                });
            });
        };
        
        // Function to get the count of songs for each year
        export const getSongsCountByYear = async () => {
            return new Promise((resolve, reject) => {
                db.transaction(tx => {
                    // Use strftime to extract the year from the release date and filter out invalid years
                    tx.executeSql('SELECT strftime("%Y", release) as year, COUNT(*) as count FROM songs WHERE strftime("%Y", release) NOT LIKE "-%" GROUP BY year ORDER BY year DESC', [], (_, { rows: { _array } }) => {
                        resolve(_array);
                    }, (_, error) => {
                        console.error('Error fetching songs count by year:', error);
                        reject(error);
                    });
                });
            });
        };

    // (Backup) Function to fetch all songs from the database and return them as a JSON string
    export const fetchAllSongsAsJson = async () => {
        try {
            const songs = await new Promise((resolve, reject) => {
                db.transaction(tx => {
                    tx.executeSql(
                        'SELECT id, title, artist, album, release, rating FROM songs',
                        [],
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

            const songsWithRatingHistory = await Promise.all(songs.map(async (song) => {
                const ratingHistory = await getSongRatingHistory(song.id);
                console.log(`[fetchAllSongsAsJson] Rating history for song with ID ${song.id}:`, ratingHistory);
                return { ...song, ratingHistory };
            }));

            return songsWithRatingHistory;
        } catch (error) {
            console.error('Error fetching songs for backup:', error);
            throw error;
        }
    };

    // (Import) Function to insert a single song into the database
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
                    async () => {
                        // After inserting the song, insert the rating history record if the song doesn't have any rating history in the JSON
                        const songId = await new Promise((resolve, reject) => {
                            tx.executeSql(
                                'SELECT last_insert_rowid() as id',
                                [],
                                (_, { rows: { _array } }) => {
                                    resolve(_array[0].id);
                                },
                                (_, error) => {
                                    console.error('Error fetching last inserted ID:', error);
                                    reject(error);
                                }
                            );
                        });

                        // Check if the song has rating history in the JSON
                        if (song.ratingHistory && song.ratingHistory.length > 0) {
                            // If the song has rating history, skip inserting a new rating history record here
                            console.log(`Song inserted successfully for song with ID: ${songId}, Rating: ${rating}.`);
                        } else {
                            // If the song doesn't have rating history in the JSON, insert the current rating in the history record if it's not 0
                            if (rating !== 0) {
                                await insertRatingHistory(songId, rating, 0, new Date().toISOString());
                                console.log(`Song inserted successfully for song with ID: ${songId}, Rating: ${rating}. No rating history found in JSON, current rating inserted to history.`);
                            }
                            console.log(`Song inserted successfully for song with ID: ${songId}, Rating: ${rating}. No rating history found in JSON, no rating history record inserted.`);
                        }

                        resolve();
                    },
                    (_, error) => {
                        console.error('Error inserting song:', error);
                        reject(error);
                    }
                );
            });
        });
    };

    // (Download Covers) Function to fetch all songs with a null cover_path
    export const fetchAlbumsWithoutCover = async () => {
        return new Promise((resolve, reject) => {
            db.transaction(tx => {
                tx.executeSql(
                    `SELECT DISTINCT artist, album
                    FROM songs
                    WHERE cover_path IS NULL
                    ORDER BY album ASC;
                    `,
                    [],
                    (_, { rows: { _array } }) => {
                        resolve(_array);
                    },
                    (_, error) => {
                        console.error('Error fetching songs without cover:', error);
                        reject(error);
                    }
                );
            });
        });
    };

    // (Delete Database) Function to handle the deletion of all songs in the database
    export const deleteData = async () => {
        try {
            await new Promise((resolve, reject) => {
                db.transaction(tx => {
                    tx.executeSql('DROP TABLE IF EXISTS songs', [], () => {
                        tx.executeSql('DROP TABLE IF EXISTS song_rating_history', [], () => {
                            tx.executeSql('DROP TABLE IF EXISTS tags', [], () => {
                                tx.executeSql('DROP TABLE IF EXISTS song_tags', [], () => {
                                    resolve();
                                }, (_, error) => reject(error));
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

    // (Delete Covers) Function to delete the cache and update cover_path of all songs to null
    export const coverPathToNull = async () => {
        try {
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

// Card.js
    // Function to update the cover_path of a song in the database
    export const updateSongCoverPath = async (songId, coverPath) => {
        return new Promise((resolve, reject) => {
            db.transaction(tx => {
                tx.executeSql(
                    'UPDATE songs SET cover_path = ? WHERE id = ?',
                    [coverPath, songId],
                    () => {
                        console.log(`Cover path updated for song with ID: ${songId}`);
                        resolve();
                    },
                    (_, error) => {
                        console.error('Error updating cover path:', error);
                        reject(error);
                    }
                );
            });
        });
    };

    // Insert a rating history record
    export const insertRatingHistory = async (songId, rating, previous_rating, datetime = new Date().toISOString()) => {
        console.log(`[insertRatingHistory] Inserting rating history for song with ID: ${songId}, Rating: ${rating}, Previous Rating: ${previous_rating}, Datetime: ${datetime}`);
        return new Promise((resolve, reject) => {
            db.transaction(tx => {
                tx.executeSql(
                    'INSERT INTO song_rating_history (song_id, rating, previous_rating, datetime) VALUES (?, ?, ?, ?)',
                    [songId, rating, previous_rating, datetime],
                    () => {
                        resolve();
                    },
                    (_, error) => {
                        console.error('Error inserting rating history:', error);
                        reject(error);
                    }
                );
            });
        });
    };

    // Function to update the rating of a song in the database
    export const updateSongRating = async (songId, rating, previousRating) => {
        return new Promise(async (resolve, reject) => {
            try {
                // Update the song's rating in the songs table
                await new Promise((resolve, reject) => {
                    db.transaction(tx => {
                        tx.executeSql(
                            'UPDATE songs SET rating = ? WHERE id = ?',
                            [rating, songId],
                            () => {
                                resolve();
                            },
                            (_, error) => {
                                console.error('Error updating song rating in songs table:', error);
                                reject(error);
                            }
                        );
                    });
                });
    
                // Insert the rating history record
                await insertRatingHistory(songId, rating, previousRating);
    
                console.log(`Song rating updated successfully for song with ID: ${songId}, New Rating: ${rating}`);
                resolve();
            } catch (error) {
                console.error('Error updating song rating:', error);
                reject(error);
            }
        });
    };

    // Function to fetch the rating history of a song
    export const getSongRatingHistory = async (songId) => {
        console.log(`[getSongRatingHistory] Fetching rating history for song with ID: ${songId}`);
        return new Promise((resolve, reject) => {
            db.transaction(tx => {
                tx.executeSql(
                    'SELECT rating, previous_rating, datetime FROM song_rating_history WHERE song_id = ? ORDER BY datetime DESC',
                    [songId],
                    (_, { rows: { _array } }) => {
                        console.log(`[getSongRatingHistory] Rating history fetched for song with ID: ${songId}. Rating history: ${_array}`);
                        resolve(_array);
                    },
                    (_, error) => {
                        console.error('Error fetching song rating history:', error);
                        reject(error);
                    }
                );
            });
        });
    };

// History.js
export const fetchGlobalRatingHistory = async (offset = 0) => {
    return new Promise((resolve, reject) => {
        db.transaction(tx => {
            tx.executeSql(
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
                [offset],
                (_, { rows: { _array } }) => {
                    resolve(_array);
                }, 
                (_, error) => {
                    console.error('Error fetching global rating history:', error);
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