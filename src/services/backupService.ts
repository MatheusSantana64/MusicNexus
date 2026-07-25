// src/services/backupService.ts
// Firestore collection backup service
import { collection, doc, getDocs, setDoc, writeBatch } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';

const BATCH_SIZE = 500;

const META_DOC_ID = '_meta';

const COLLECTIONS = ['savedMusic', 'tags', 'userProfile'] as const;

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

export interface LocalBackupData {
  version: 1;
  timestamp: string;
  collections: Record<string, Array<{ id: string; data: Record<string, unknown> }>>;
}

export async function exportLocalBackup(
  onProgress?: (progress: BackupProgress) => void,
): Promise<void> {
  const collections: LocalBackupData['collections'] = {};
  let totalDocs = 0;

  for (const name of COLLECTIONS) {
    const snapshot = await getDocs(collection(db, name));
    const docs = snapshot.docs.filter(d => d.id !== META_DOC_ID);
    collections[name] = docs.map(d => ({ id: d.id, data: d.data() }));
    totalDocs += docs.length;
    onProgress?.({ phase: name, current: totalDocs, total: totalDocs });
  }

  const payload: LocalBackupData = {
    version: 1,
    timestamp: new Date().toISOString(),
    collections,
  };

  const json = JSON.stringify(payload, null, 2);
  const fileName = `musicnexus-backup-${getTimestampSuffix()}.json`;
  const fileUri = FileSystem.cacheDirectory + fileName;
  await FileSystem.writeAsStringAsync(fileUri, json, { encoding: FileSystem.EncodingType.UTF8 });
  await Sharing.shareAsync(fileUri, { mimeType: 'application/json', dialogTitle: 'Save backup file' });
}

export async function importLocalBackup(
  onProgress?: (progress: BackupProgress) => void,
): Promise<{ savedMusic: number; tags: number; userProfile: number }> {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/json',
    copyToCacheDirectory: true,
  });

  if (result.canceled || !result.assets?.[0]) {
    throw new Error('cancelled');
  }

  const fileUri = result.assets[0].uri;
  const json = await FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.UTF8 });
  const payload: LocalBackupData = JSON.parse(json);

  if (!payload.version || !payload.collections) {
    throw new Error('Invalid backup file format');
  }

  const counts: Record<string, number> = {};

  for (const name of COLLECTIONS) {
    const docs = payload.collections[name] || [];
    let restored = 0;

    for (let i = 0; i < docs.length; i += BATCH_SIZE) {
      const chunk = docs.slice(i, i + BATCH_SIZE);
      const batch = writeBatch(db);

      for (const { id, data } of chunk) {
        const docRef = doc(db, name, id);
        batch.set(docRef, data);
      }

      await batch.commit();
      restored += chunk.length;

      onProgress?.({
        phase: name,
        current: restored,
        total: docs.length,
      });
    }

    counts[name] = restored;
  }

  return {
    savedMusic: counts.savedMusic || 0,
    tags: counts.tags || 0,
    userProfile: counts.userProfile || 0,
  };
}
