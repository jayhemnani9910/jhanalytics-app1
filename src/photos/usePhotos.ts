import { useState, useCallback, useEffect, useRef } from 'react';
import imageCompression from 'browser-image-compression';
import { savePhoto, getPhoto, deletePhoto, listPhotos } from './queue';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../firebase/config';
import { updateOrder } from '../firebase/repo';
import { useStore } from '../store/useStore';

// Global cache to persist object URLs across renders and screen transitions
const objectUrlCache: Record<string, string> = {};

export function usePhotos() {
  const [resolvedUrls, setResolvedUrls] = useState<Record<string, string>>({});

  const resolvePhotos = useCallback(async (photoRefs: string[]) => {
    let changed = false;
    const newResolved = { ...resolvedUrls };

    for (const refStr of photoRefs) {
      if (newResolved[refStr]) continue;

      if (refStr.startsWith('local:')) {
        const localId = refStr.slice(6);
        if (objectUrlCache[refStr]) {
          newResolved[refStr] = objectUrlCache[refStr];
          changed = true;
        } else {
          try {
            const blob = await getPhoto(localId);
            if (blob) {
              const url = URL.createObjectURL(blob);
              objectUrlCache[refStr] = url;
              newResolved[refStr] = url;
              changed = true;
            }
          } catch (err) {
            console.error('Failed to load local photo blob:', refStr, err);
          }
        }
      } else {
        newResolved[refStr] = refStr;
        changed = true;
      }
    }

    if (changed) {
      setResolvedUrls(newResolved);
    }
  }, [resolvedUrls]);

  const compressAndSavePhoto = useCallback(async (file: File): Promise<string> => {
    const options = {
      maxSizeMB: 0.15,
      maxWidthOrHeight: 1280,
      initialQuality: 0.7,
      useWebWorker: true,
    };
    const compressed = await imageCompression(file, options);
    const localId = crypto.randomUUID();
    await savePhoto(localId, compressed);

    const refStr = `local:${localId}`;
    const objectUrl = URL.createObjectURL(compressed);
    objectUrlCache[refStr] = objectUrl;
    setResolvedUrls((prev) => ({ ...prev, [refStr]: objectUrl }));

    return refStr;
  }, []);

  const deletePhotoRef = useCallback(async (
    photoRef: string,
    orderId?: string,
    currentPhotos?: string[]
  ): Promise<void> => {
    if (objectUrlCache[photoRef]) {
      URL.revokeObjectURL(objectUrlCache[photoRef]);
      delete objectUrlCache[photoRef];
    }

    if (photoRef.startsWith('local:')) {
      const localId = photoRef.slice(6);
      await deletePhoto(localId);
    } else {
      try {
        const fileRef = ref(storage, photoRef);
        await deleteObject(fileRef);
      } catch (err) {
        console.error('Failed to delete remote storage object:', photoRef, err);
      }
    }

    if (orderId && currentPhotos) {
      const updatedPhotos = currentPhotos.filter((p) => p !== photoRef);
      await updateOrder(orderId, { photos: updatedPhotos });
    }
  }, []);

  return {
    compressAndSavePhoto,
    deletePhotoRef,
    resolvedUrls,
    resolvePhotos,
  };
}

// Background sync hook
export function usePhotoSync() {
  const online = useStore((s) => s.online);
  const orders = useStore((s) => s.orders);
  const ready = useStore((s) => s.ready);
  const syncingRef = useRef(false);

  useEffect(() => {
    if (!online || !ready || syncingRef.current) return;

    const runSync = async () => {
      syncingRef.current = true;
      try {
        const localIds = await listPhotos();
        for (const localId of localIds) {
          const targetRef = `local:${localId}`;
          const order = orders.find((o) => o.photos?.includes(targetRef));
          if (!order) continue;

          const blob = await getPhoto(localId);
          if (!blob) {
            await deletePhoto(localId);
            continue;
          }

          try {
            const fileRef = ref(storage, `orders/${order.id}/${localId}.jpg`);
            await uploadBytes(fileRef, blob);
            const downloadUrl = await getDownloadURL(fileRef);

            const updatedPhotos = order.photos.map((p) => p === targetRef ? downloadUrl : p);
            await updateOrder(order.id, { photos: updatedPhotos });
            await deletePhoto(localId);
          } catch (uploadErr) {
            console.error('Error syncing photo to storage:', localId, uploadErr);
          }
        }
      } catch (err) {
        console.error('Photo sync loop failed:', err);
      } finally {
        syncingRef.current = false;
      }
    };

    runSync();
  }, [online, orders, ready]);
}
