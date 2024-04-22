// This file contains the code to initialize the SQLite database.
// It creates the songs, indexes, tags, and song_tags tables if they do not already exist.

import * as SQLite from 'expo-sqlite';

// Open or create the database
const db = SQLite.openDatabase('musicnexus.db');

export const initDatabase = () => {
    db.transaction(tx => {
        // Create songs table
        tx.executeSql(`
            CREATE TABLE IF NOT EXISTS songs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                artist TEXT NOT NULL,
                album TEXT NOT NULL,
                release TEXT NOT NULL,
                rating INTEGER NOT NULL,
                cover_path TEXT
            );
        `);

        // Create indexes for faster searching
        tx.executeSql('CREATE INDEX IF NOT EXISTS idx_songs_title_artist_album ON songs(title, artist, album);');
        tx.executeSql('CREATE INDEX IF NOT EXISTS idx_songs_rating ON songs(rating);');
        tx.executeSql('CREATE INDEX IF NOT EXISTS idx_songs_release ON songs(release);');
        tx.executeSql('CREATE INDEX IF NOT EXISTS idx_songs_title ON songs(title);');
        tx.executeSql('CREATE INDEX IF NOT EXISTS idx_songs_artist ON songs(artist);');
        tx.executeSql('CREATE INDEX IF NOT EXISTS idx_songs_album ON songs(album);');

        // Create tags table
        tx.executeSql(`
            CREATE TABLE IF NOT EXISTS tags (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                color TEXT NOT NULL
            );
        `);

        // Create song_tags table
        tx.executeSql(`
            CREATE TABLE IF NOT EXISTS song_tags (
                song_id INTEGER,
                tag_id INTEGER,
                FOREIGN KEY(song_id) REFERENCES songs(id),
                FOREIGN KEY(tag_id) REFERENCES tags(id),
                PRIMARY KEY(song_id, tag_id)
            );
        `);
    }, (error) => {
        console.log("Error initializing database: ", error);
    });
};

export { db };