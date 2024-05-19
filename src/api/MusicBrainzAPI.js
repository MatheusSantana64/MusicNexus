// MusicBrainz API for fetching album cover and release MBID

const USER_AGENT = 'MusicNexusApp/0.2 ( https://github.com/MatheusSantana64/MusicNexus )';

let queue = [];
let isProcessing = false;

// Add a new item to the queue
function addToQueue(artist, album) {
    return new Promise((resolve) => {
        // Add the item to the queue
        //console.log(`Adding item to queue: album "${album}" by "${artist}"`);
        queue.push({ artist, album, resolve });
        // Process the queue if it's not already processing
        if (!isProcessing) {
            processQueue();
        }
    });
}

// Fetch album cover and release MBID for the given artist and album
async function processQueue() {
    if (queue.length === 0) {
        isProcessing = false;
        return;
    }

    isProcessing = true;
    // Process up to 5 items from the queue simultaneously
    const promises = [];
    for (let i = 0; i < 5 && queue.length > 0; i++) {
        const { artist, album, resolve } = queue.shift();
        promises.push(fetchAlbumCover(artist, album).then(resolve, () => resolve(null)));
    }

    // Wait for all promises to resolve
    await Promise.all(promises);

    // Process the next set of items in the queue
    processQueue();
}

// Fetch album cover and release MBID for the given artist and album
async function fetchAlbumCover(artist, album) {
    // If the cover is not in the cache, fetch it from the API
    const mbid = await fetchReleaseMbid(artist, album);
    if (!mbid) {
        //console.error(`Failed to fetch MBID for the album "${album}" by "${artist}"`);
        return null;
    }

    //console.log(`Fetching cover art for the album "${album}" by "${artist}" with MBID: ${mbid}.`);

    // Download the image and store its local path in the database
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
                return coverUrl;
            } else {
                //console.error(`No small thumbnail available for the album "${album}" by "${artist}"`);
                return null;
            }
        } else {
            //console.error(`Unexpected response status for the album "${album}" by "${artist}". Expected 200 but received: ${response.status}`);
            return null;
        }
    } catch (error) {
        //console.error(`Error fetching album cover for the album "${album}" by "${artist}":`, error);
        return null;
    }
}

// Function to clean the album name by removing specified words
function cleanAlbumName(albumName) {
    // Regular expression to match the specified words
    const regex = /\b( - the |first|second|third|1st|2nd|3rd|4th|5th|6th|7th|8th|9th|10th|mini album|full album|album|single|ep|repackage|repack|repackaged)\b/gi;
    // Remove the matched words
    return albumName.replace(regex, '');
}

// Fetch release MBID for the given artist and album
async function fetchReleaseMbid(artist, album) {
    // Clean the album name
    const cleanedAlbum = cleanAlbumName(album);
    //console.log(`Searching for MBID for the album "${cleanedAlbum}" by "${artist}"`);
    const queryString = `release:${encodeURIComponent(cleanedAlbum)} AND artist:${encodeURIComponent(artist)}`;
    const url = `https://musicbrainz.org/ws/2/release/?query=${queryString}&fmt=json`;

    // Search for the release MBID
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': USER_AGENT
            }
        });

        if (!response.ok) {
            //console.error(`Failed to fetch release MBID for artist: ${artist}, album: ${cleanedAlbum}. HTTP ${response.status}`);
            throw new Error(`Failed to fetch release MBID: HTTP ${response.status}`);
        }

        // Parse the JSON response
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
            //console.log(`MBID for the album "${cleanedAlbum}" by "${artist}" is: ${mbid}`);
            return mbid;
        } else {
            throw new Error(`No release with cover art found for the album "${cleanedAlbum}" by "${artist}"`);
        }
    } catch (error) {
        //console.error(`Error fetching release MBID for the album "${cleanedAlbum}" by "${artist}":`, error);
        return null;
    }
}

export { addToQueue, fetchAlbumCover, cleanAlbumName };