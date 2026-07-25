// src/services/backupService.ts
// Firestore collection backup service
import { collection, doc, getDocs, setDoc, writeBatch } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';

const BATCH_SIZE = 500;

const META_DOC_ID = '_meta';

function getTimestampSuffix(): string {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yy}${mm}${dd}`;
}

interface BackupResult {
  savedMusic: number;
  tags: number;
  userProfile: number;
  timestamp: string;
}

interface BackupProgress {
  phase: string;
  current: number;
  total: number;
}

async function backupCollection(
  sourceName: string,
  onProgress?: (progress: BackupProgress) => void,
): Promise<number> {
  const snapshot = await getDocs(collection(db, sourceName));
  const docs = snapshot.docs.filter(d => d.id !== META_DOC_ID);

  if (docs.length === 0) return 0;

  const backupName = `${sourceName}Backup${getTimestampSuffix()}`;
  let backedUp = 0;

  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const chunk = docs.slice(i, i + BATCH_SIZE);
    const batch = writeBatch(db);

    for (const docSnap of chunk) {
      const backupDocRef = doc(db, backupName, docSnap.id);
      batch.set(backupDocRef, docSnap.data());
    }

    await batch.commit();
    backedUp += chunk.length;

    onProgress?.({
      phase: sourceName,
      current: backedUp,
      total: docs.length,
    });
  }

  return backedUp;
}

export async function backupAllCollections(
  onProgress?: (progress: BackupProgress) => void,
): Promise<BackupResult> {
  const timestamp = getTimestampSuffix();
  const savedMusicCount = await backupCollection('savedMusic', onProgress);
  const tagsCount = await backupCollection('tags', onProgress);
  const userProfileCount = await backupCollection('userProfile', onProgress);

  return {
    savedMusic: savedMusicCount,
    tags: tagsCount,
    userProfile: userProfileCount,
    timestamp,
  };
}
