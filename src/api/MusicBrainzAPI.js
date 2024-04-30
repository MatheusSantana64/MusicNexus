// MusicBrainz API for fetching album cover and release MBID

const USER_AGENT = 'MusicNexusApp/0.1 ( https://github.com/MatheusSantana64/MusicNexus )';

const coverCache = {};
let queue = [];
let isProcessing = false;

// Add a new item to the queue
function addToQueue(artist, album) {
    return new Promise((resolve) => {
        // Add the item to the queue
        console.log(`Adding item to queue: album "${album}" by "${artist}"`);
        queue.push({ artist, album, resolve });
        // Process the queue if it's not already processing
        if (!isProcessing) {
            processQueue();
        }
    });
}

// Fetch album cover and release MBID for the given artist and album
async function processQueue() {
    console.log('Processing queue...');
    if (queue.length === 0) {
        isProcessing = false;
        return;
    }

    isProcessing = true;
    const { artist, album, resolve } = queue.shift();
    console.log(`Processing item from queue: album "${album}" by "${artist}"`);

    try {
        const coverUrl = await fetchAlbumCover(artist, album);
        console.log(`Fetched cover URL for the album "${album}" by "${artist}":`, coverUrl);
        resolve(coverUrl);
    } catch (error) {
        console.error(`Error fetching album cover for the album "${album}" by "${artist}":`, error);
        resolve(null); // Resolve with null in case of error
    }

    setTimeout(processQueue, 100); // Delay for 100ms before processing the next item to avoid overloading the API
}

// Fetch album cover and release MBID for the given artist and album
async function fetchAlbumCover(artist, album, cacheKey) {
    // If the cover is not in the cache, fetch it from the API
    const mbid = await fetchReleaseMbid(artist, album);
    console.log(`MBID for the album "${album}" by "${artist}" is: ${mbid}`);
    if (!mbid) {
        console.error(`Failed to fetch MBID for the album "${album}" by "${artist}"`);
        return null;
    }

    console.log(`Fetching cover art for the album "${album}" by "${artist}" with MBID: ${mbid}.`);

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
                //console.log(`Small thumbnail URL for the album "${album}" by "${artist}" is: ${coverUrl}`);
                coverCache[cacheKey] = coverUrl;
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

// Fetch release MBID for the given artist and album
async function fetchReleaseMbid(artist, album) {
    //console.log(`Searching for MBID for the album "${album}" by "${artist}"`);
    const queryString = `release:${encodeURIComponent(album)} AND artist:${encodeURIComponent(artist)}`;
    const url = `https://musicbrainz.org/ws/2/release/?query=${queryString}&fmt=json`;

    // Search for the release MBID
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
            console.log(`MBID for the album "${album}" by "${artist}" is: ${mbid}`);
            return mbid;
        } else {
            throw new Error(`No release with cover art found for the album "${album}" by "${artist}"`);
        }
    } catch (error) {
        console.error(`Error fetching release MBID for the album "${album}" by "${artist}":`, error);
        return null;
    }
}

export { addToQueue };