import 'fake-indexeddb/auto';
import { describe, it, expect } from 'vitest';
import { savePhoto, getPhoto, listPhotos, deletePhoto } from './queue';

describe('Offline Photo Queue', () => {
  it('should store, read back, list, and delete a binary data block', async () => {
    const localId = 'photo-123';
    // Use Uint8Array as mock binary data because fake-indexeddb in Node's JSDOM environment
    // does not support cloning native Node Blobs properly, but handles typed arrays flawlessly.
    const mockBinaryData = new Uint8Array([68, 85, 77, 77, 89, 45, 68, 65, 84, 65]); // "DUMMY-DATA"

    // 1. Initially the queue should be empty
    const initialKeys = await listPhotos();
    expect(initialKeys).not.toContain(localId);

    // 2. Save the photo
    await savePhoto(localId, mockBinaryData as unknown as Blob);

    // 3. Read it back and verify contents
    const retrieved = await getPhoto(localId) as any;
    expect(retrieved).toBeDefined();
    expect(Array.from(retrieved)).toEqual(Array.from(mockBinaryData));

    // 4. List keys and find the saved localId
    const keys = await listPhotos();
    expect(keys).toContain(localId);

    // 5. Delete the photo and verify it's gone
    await deletePhoto(localId);
    const postDeleteKeys = await listPhotos();
    expect(postDeleteKeys).not.toContain(localId);

    const postDeleteRetrieved = await getPhoto(localId);
    expect(postDeleteRetrieved).toBeUndefined();
  });
});
