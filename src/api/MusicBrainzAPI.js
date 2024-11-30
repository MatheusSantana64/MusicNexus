// MusicBrainz API for fetching album cover and release MBID

const USER_AGENT = 'MusicNexusApp/0.4.1 ( https://github.com/MatheusSantana64/MusicNexus )';

let queue = [];
let isProcessing = false;
const BATCH_SIZE = 10;
const BATCH_DELAY = 100;

function addToQueue(artist, album) {
  return new Promise((resolve) => {
    queue.push({ artist, album, resolve });
    if (!isProcessing) {
      processQueue();
    }
  });
}

async function processQueue() {
  if (queue.length === 0) {
    isProcessing = false;
    return;
  }

  isProcessing = true;
  const batch = queue.splice(0, BATCH_SIZE);
  await Promise.all(
    batch.map(({ artist, album, resolve }) =>
      fetchAlbumCover(artist, album)
        .then(resolve)
        .catch(() => resolve(null))
    )
  );

  setTimeout(processQueue, BATCH_DELAY);
}

async function fetchAlbumCover(artist, album) {
  const mbid = await fetchReleaseMbid(artist, album);
  if (!mbid) return null;

  try {
    const response = await fetch(`https://coverartarchive.org/release/${mbid}/front-250`, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'image/jpeg',
      },
    });

    if (!response.ok) return null;

    return response.url || null;
  } catch {
    return null;
  }
}

function cleanAlbumName(albumName) {
  const regex =
    /\b( - the |first|second|third|1st|2nd|3rd|4th|5th|6th|7th|8th|9th|10th|mini album|full album|album|single|ep|repackage|repack|repackaged)\b/gi;
  return albumName.replace(regex, '').trim();
}

async function fetchReleaseMbid(artist, album) {
  const cleanedAlbum = cleanAlbumName(album);
  const queryString = `release:"${cleanedAlbum}" AND artist:"${artist}"`;
  const url = `https://musicbrainz.org/ws/2/release/?query=${encodeURIComponent(
    queryString
  )}&fmt=json&limit=1`;

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