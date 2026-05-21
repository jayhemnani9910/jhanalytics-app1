import { openDB } from 'idb';

const DB_NAME = 'tailor-photos-db';
const STORE_NAME = 'photos';
const DB_VERSION = 1;

async function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    },
  });
}

export async function savePhoto(localId: string, blob: Blob): Promise<void> {
  const db = await getDB();
  await db.put(STORE_NAME, blob, localId);
}

export async function getPhoto(localId: string): Promise<Blob | undefined> {
  const db = await getDB();
  return db.get(STORE_NAME, localId);
}

export async function listPhotos(): Promise<string[]> {
  const db = await getDB();
  const keys = await db.getAllKeys(STORE_NAME);
  return keys as string[];
}

export async function deletePhoto(localId: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORE_NAME, localId);
}
