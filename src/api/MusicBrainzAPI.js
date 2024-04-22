// MusicBrainz API for fetching album cover and release MBID

const USER_AGENT = 'MusicNexusApp/0.1 ( https://github.com/MatheusSantana64/MusicNexus )';

const coverCache = {};
let queue = [];
let isProcessing = false;

function generateCacheKey(artist, album) {
    const key = `${artist}-${album}`;
    return key.replace(/[^a-zA-Z0-9]/g, '_');
}

async function processQueue() {
    if (queue.length === 0) {
        isProcessing = false;
        return;
    }

    isProcessing = true;
    const { artist, album, resolve } = queue.shift();

    try {
        const coverUrl = await fetchAlbumCover(artist, album);
        resolve(coverUrl);
    } catch (error) {
        console.error(`Error fetching album cover for artist: ${artist}, album: ${album}:`, error);
        resolve(null); // Resolve with null in case of error
    }

    setTimeout(processQueue, 500); // Delay for half second
}

function addToQueue(artist, album) {
    return new Promise((resolve) => {
        queue.push({ artist, album, resolve });
        if (!isProcessing) {
            processQueue();
        }
    });
}

async function fetchAlbumCover(artist, album) {
    const cacheKey = generateCacheKey(artist, album);
    if (coverCache[cacheKey]) {
        return coverCache[cacheKey];
    }

    const mbid = await fetchReleaseMbid(artist, album);
    if (!mbid) {
        console.error(`Failed to fetch MBID for artist: ${artist}, album: ${album}`);
        return null;
    }

    console.log(`Fetching cover art for artist: ${artist}, album: ${album} with MBID: ${mbid}`);

    try {
        const response = await fetch(`https://coverartarchive.org/release/${mbid}`, {
            headers: {
                'User-Agent': USER_AGENT,
                'Accept': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            const coverUrl = data.images[0]?.thumbnails?.small;
            if (coverUrl) {
                console.log(`Small thumbnail URL for artist: ${artist}, album: ${album} is: ${coverUrl}`);
                coverCache[cacheKey] = coverUrl;
                return coverUrl;
            } else {
                console.error(`No small thumbnail available for artist: ${artist}, album: ${album}`);
                return null;
            }
        } else {
            console.error(`Unexpected response status for artist: ${artist}, album: ${album}. Expected 200 but received: ${response.status}`);
            return null;
        }
    } catch (error) {
        console.error(`Error fetching album cover for artist: ${artist}, album: ${album}:`, error);
        return null;
    }
}

async function fetchReleaseMbid(artist, album) {
    console.log(`Searching for MBID for artist: ${artist}, album: ${album}`);
    const queryString = `release:${encodeURIComponent(album)} AND artist:${encodeURIComponent(artist)}`;
    const url = `https://musicbrainz.org/ws/2/release/?query=${queryString}&fmt=json`;

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': USER_AGENT
            }
        });

        if (!response.ok) {
            console.error(`Failed to fetch release MBID for artist: ${artist}, album: ${album}. HTTP ${response.status}`);
            throw new Error(`Failed to fetch release MBID: HTTP ${response.status}`);
        }

        const data = await response.json();
        let mbid = null;
        for (const release of data.releases) {
            const coverArtResponse = await fetch(`https://coverartarchive.org/release/${release.id}`, {
                headers: {
                    'User-Agent': USER_AGENT,
                    'Accept': 'application/json'
                }
            });

            if (coverArtResponse.ok) {
                const coverArtData = await coverArtResponse.json();
                if (coverArtData.images && coverArtData.images.length > 0) {
                    mbid = release.id;
                    break;
                }
            }
        }

        if (mbid) {
            console.log(`MBID for artist: ${artist}, album: ${album} is: ${mbid}`);
            return mbid;
        } else {
            console.error(`No release with cover art found for artist: ${artist}, album: ${album}`);
            return null;
        }
    } catch (error) {
        console.error(`Error fetching release MBID for artist: ${artist}, album: ${album}:`, error);
        return null;
    }
}

export { addToQueue as fetchAlbumCover, generateCacheKey };