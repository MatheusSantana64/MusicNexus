// MusicBrainz API for fetching album cover and release MBID

const USER_AGENT = 'MusicNexusApp/0.3.7 ( https://github.com/MatheusSantana64/MusicNexus )';

let queue = [];
let isProcessing = false;

// Add a new item to the queue
function addToQueue(artist, album) {
  return new Promise((resolve) => {
    queue.push({ artist, album, resolve });
    if (!isProcessing) {
      processQueue();
    }
  });
}

// Process the queue
async function processQueue() {
  if (queue.length === 0) {
    isProcessing = false;
    return;
  }

  isProcessing = true;
  const batch = queue.splice(0, 20);
  await Promise.all(
    batch.map(({ artist, album, resolve }) =>
      fetchAlbumCover(artist, album).then(resolve).catch(() => resolve(null))
    )
  );
  processQueue();
}

// Fetch album cover URL for the given artist and album
async function fetchAlbumCover(artist, album) {
  const mbid = await fetchReleaseMbid(artist, album);
  if (!mbid) return null;

  try {
    const response = await fetch(`https://coverartarchive.org/release/${mbid}`, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/json',
      },
    });

    if (!response.ok) return null;

    const data = await response.json();
    const coverUrl = data.images[0]?.thumbnails?.small;
    return coverUrl || null;
  } catch {
    return null;
  }
}

// Clean the album name by removing specified words
function cleanAlbumName(albumName) {
  const regex =
    /\b( - the |first|second|third|1st|2nd|3rd|4th|5th|6th|7th|8th|9th|10th|mini album|full album|album|single|ep|repackage|repack|repackaged)\b/gi;
  return albumName.replace(regex, '');
}

// Fetch release MBID for the given artist and album
async function fetchReleaseMbid(artist, album) {
  const cleanedAlbum = cleanAlbumName(album);
  const queryString = `release:${encodeURIComponent(cleanedAlbum)} AND artist:${encodeURIComponent(
    artist
  )}`;
  const url = `https://musicbrainz.org/ws/2/release/?query=${queryString}&fmt=json&limit=1`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
      },
    });

    if (!response.ok) return null;

    const data = await response.json();
    const release = data.releases?.[0];
    return release ? release.id : null;
  } catch {
    return null;
  }
}

export { addToQueue, fetchAlbumCover, cleanAlbumName };