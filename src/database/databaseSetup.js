import * as SQLite from 'expo-sqlite';

// Open or create the database
const db = SQLite.openDatabase('musicnexus.db');

const executeSql = (query, params = []) => {
    return new Promise((resolve, reject) => {
        db.transaction(tx => {
            tx.executeSql(query, params, (tx, result) => {
                resolve(result);
            }, (tx, error) => {
                reject(error);
            });
        });
    });
};

export const initDatabase = () => {
    db.transaction(tx => {
        // Create songs table
        executeSql(`
            CREATE TABLE IF NOT EXISTS songs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                artist TEXT NOT NULL,
                album TEXT NOT NULL,
                release TEXT NOT NULL,
                rating REAL NOT NULL,
                cover_path TEXT
            );
        `).then(result => {
            console.log("Songs table created successfully");
        }).catch(error => {
            console.log("Error creating songs table: ", error);
        });

        // Create indexes for faster searching
        const indexes = [
            'CREATE INDEX IF NOT EXISTS idx_songs_title ON songs(title);',
            'CREATE INDEX IF NOT EXISTS idx_songs_artist ON songs(artist);',
            'CREATE INDEX IF NOT EXISTS idx_songs_album ON songs(album);',
            'CREATE INDEX IF NOT EXISTS idx_songs_rating ON songs(rating);',
            'CREATE INDEX IF NOT EXISTS idx_songs_release ON songs(release);'
        ];

        indexes.forEach(query => {
            executeSql(query).then(result => {
                console.log("Index created successfully");
            }).catch(error => {
                console.log("Error creating index: ", error);
            });
        });

        // Create song_rating_history table
        executeSql(`
            CREATE TABLE IF NOT EXISTS song_rating_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                song_id INTEGER,
                rating REAL NOT NULL,
                previous_rating REAL NOT NULL,
                datetime TEXT NOT NULL,
                FOREIGN KEY(song_id) REFERENCES songs(id)
            );
        `).then(result => {
            console.log("Song rating history table created successfully");
        }).catch(error => {
            console.log("Error creating song rating history table: ", error);
        });

        // Create tags table
        executeSql(`
            CREATE TABLE IF NOT EXISTS tags (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                color TEXT NOT NULL,
                position INTEGER NOT NULL DEFAULT 0
            );
        `).then(result => {
            console.log("Tags table created successfully");
        }).catch(error => {
            console.log("Error creating tags table: ", error);
        });

        // Alter tags table to add position column if it doesn't exist
        executeSql(`
            ALTER TABLE tags ADD COLUMN position INTEGER NOT NULL DEFAULT 0;
        `).then(result => {
            console.log("Position column added to tags table successfully");
        }).catch(error => {
            if (error.message.includes('duplicate column name')) {
                console.log("Position column already exists in tags table");
            } else {
                console.log("Error adding position column to tags table: ", error);
            }
        });

        // Create song_tags table
        executeSql(`
            CREATE TABLE IF NOT EXISTS song_tags (
                song_id INTEGER,
                tag_id INTEGER,
                FOREIGN KEY(song_id) REFERENCES songs(id),
                FOREIGN KEY(tag_id) REFERENCES tags(id),
                PRIMARY KEY(song_id, tag_id)
            );
        `).then(result => {
            console.log("Song tags table created successfully");
        }).catch(error => {
            console.log("Error creating song tags table: ", error);
        });
    }, (error) => {
        console.log("Error initializing database: ", error);
    }, () => {
        console.log("Database initialized successfully");
    });
};

export { db, executeSql };