import type { Item } from '../types/schema';
import { initFirebase, isFirebaseConfigured, sanitizeForFirestore } from './firebase';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export interface SyncQueueItem {
  id: string; // unique queue action id
  itemId: string;
  action: 'save' | 'delete';
  item?: Item;
  timestamp: number;
  retryCount: number;
  lastError?: string;
}

export interface SyncStatusState {
  pendingCount: number;
  pendingItemIds: string[];
  isSyncing: boolean;
  isOnline: boolean;
  isFirebaseActive: boolean;
  lastSyncTime?: number;
}

const IDB_NAME = 'curator_antiques_idb';
const IDB_VERSION = 2;
export const STORE_ITEMS = 'items';
export const STORE_SYNC_QUEUE = 'sync_queue';

export function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not supported'));
      return;
    }

    const request = indexedDB.open(IDB_NAME, IDB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_ITEMS)) {
        db.createObjectStore(STORE_ITEMS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_SYNC_QUEUE)) {
        db.createObjectStore(STORE_SYNC_QUEUE, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ---------------------------------------------------------------------------
// Sync Queue Low-Level Helpers
// ---------------------------------------------------------------------------

export async function getPendingSyncItems(): Promise<SyncQueueItem[]> {
  try {
    const db = await openIDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_SYNC_QUEUE, 'readonly');
      const store = tx.objectStore(STORE_SYNC_QUEUE);
      const req = store.getAll();
      req.onsuccess = () => {
        const items = (req.result as SyncQueueItem[]) || [];
        items.sort((a, b) => a.timestamp - b.timestamp);
        resolve(items);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Failed to read sync queue from IDB:', err);
    return [];
  }
}

export async function getPendingSyncCount(): Promise<number> {
  try {
    const db = await openIDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_SYNC_QUEUE, 'readonly');
      const store = tx.objectStore(STORE_SYNC_QUEUE);
      const countReq = store.count();
      countReq.onsuccess = () => resolve(countReq.result || 0);
      countReq.onerror = () => resolve(0);
    });
  } catch {
    return 0;
  }
}

export async function cancelPendingSyncForItem(itemId: string): Promise<void> {
  if (!itemId) return;
  try {
    const db = await openIDB();
    const existing = await getPendingSyncItems();
    const matching = existing.filter((entry) => entry.itemId === itemId);
    if (matching.length === 0) return;

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_SYNC_QUEUE, 'readwrite');
      const store = tx.objectStore(STORE_SYNC_QUEUE);
      for (const m of matching) {
        store.delete(m.id);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    notifyListeners();
  } catch (e) {
    console.warn('Failed to cancel pending sync for item:', e);
  }
}

export async function enqueueSyncAction(
  action: 'save' | 'delete',
  item?: Item,
  itemId?: string
): Promise<void> {
  const targetId = item ? item.id : itemId;
  if (!targetId) return;

  try {
    const db = await openIDB();
    const existing = await getPendingSyncItems();
    const existingEntry = existing.find((entry) => entry.itemId === targetId);

    // If an item is being deleted, remove any pending save entries for it
    if (action === 'delete') {
      const pendingSaves = existing.filter((entry) => entry.itemId === targetId && entry.action === 'save');
      if (pendingSaves.length > 0) {
        await new Promise<void>((resolve) => {
          const tx = db.transaction(STORE_SYNC_QUEUE, 'readwrite');
          const store = tx.objectStore(STORE_SYNC_QUEUE);
          for (const s of pendingSaves) {
            store.delete(s.id);
          }
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
        });
      }
    }

    const queueId = existingEntry ? existingEntry.id : `sync_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    const queueItem: SyncQueueItem = {
      id: queueId,
      itemId: targetId,
      action,
      item: action === 'save' ? item : undefined,
      timestamp: Date.now(),
      retryCount: existingEntry ? existingEntry.retryCount : 0,
    };

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_SYNC_QUEUE, 'readwrite');
      const store = tx.objectStore(STORE_SYNC_QUEUE);
      const putReq = store.put(queueItem);
      putReq.onsuccess = () => resolve();
      putReq.onerror = () => reject(putReq.error);
    });

    notifyListeners();

    // Trigger immediate background sync if online & Firebase configured
    if (typeof navigator !== 'undefined' && navigator.onLine && isFirebaseConfigured() && !isSyncing) {
      setTimeout(() => {
        processSyncQueue().catch((e) => console.warn('Background sync failed:', e));
      }, 50);
    }
  } catch (e) {
    console.error('Failed to enqueue sync action:', e);
  }
}

export async function removeSyncQueueItem(id: string): Promise<void> {
  try {
    const db = await openIDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_SYNC_QUEUE, 'readwrite');
      const store = tx.objectStore(STORE_SYNC_QUEUE);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
    notifyListeners();
  } catch (e) {
    console.warn('Failed to remove item from sync queue:', e);
  }
}

// Internal version without notifyListeners to avoid lockups inside processing loop
async function removeSyncQueueItemInternal(db: IDBDatabase, id: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_SYNC_QUEUE, 'readwrite');
    const store = tx.objectStore(STORE_SYNC_QUEUE);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function clearSyncQueue(): Promise<void> {
  try {
    const db = await openIDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_SYNC_QUEUE, 'readwrite');
      const store = tx.objectStore(STORE_SYNC_QUEUE);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
    notifyListeners();
  } catch (e) {
    console.warn('Failed to clear sync queue:', e);
  }
}

// ---------------------------------------------------------------------------
// Image promotion helper (Base64 data URL -> Firebase Storage URL)
// ---------------------------------------------------------------------------

function dataURLtoBlob(dataurl: string): Blob {
  const arr = dataurl.split(',');
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

// Safe upload that times out in 2.5 seconds so it NEVER hangs sync if Storage is unconfigured
async function uploadImageSafe(storage: any, path: string, blob: Blob): Promise<string | null> {
  try {
    const storageRef = ref(storage, path);
    const uploadPromise = uploadBytes(storageRef, blob).then((res) => getDownloadURL(res.ref));
    const result = await Promise.race([
      uploadPromise,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500))
    ]);
    return result;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Main Sync Processing Engine
// ---------------------------------------------------------------------------

let isSyncing = false;

export async function processSyncQueue(): Promise<{
  processed: number;
  errors: number;
  message: string;
}> {
  if (isSyncing) {
    return { processed: 0, errors: 0, message: 'Sync already in progress.' };
  }

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    notifyListeners();
    return { processed: 0, errors: 0, message: 'Currently offline. Changes remain queued safely in local storage.' };
  }

  const { db, storage, isConfigured } = initFirebase();
  if (!isConfigured || !db) {
    notifyListeners();
    return { processed: 0, errors: 0, message: 'Firebase not configured. Operating in local storage mode.' };
  }

  const queue = await getPendingSyncItems();
  if (queue.length === 0) {
    notifyListeners();
    return { processed: 0, errors: 0, message: 'Sync queue is empty. Everything is up to date.' };
  }

  isSyncing = true;
  notifyListeners();

  let processed = 0;
  let errors = 0;

  try {
    const idb = await openIDB();

    for (const queueItem of queue) {
      try {
        if (queueItem.action === 'save' && queueItem.item) {
          // Double check if item was deleted locally while in queue
          const isLocallyDeleted = await new Promise<boolean>((resolve) => {
            try {
              const tx = idb.transaction(STORE_ITEMS, 'readonly');
              const store = tx.objectStore(STORE_ITEMS);
              const req = store.get(queueItem.itemId);
              req.onsuccess = () => resolve(!req.result);
              req.onerror = () => resolve(false);
            } catch {
              resolve(false);
            }
          });

          if (isLocallyDeleted) {
            // Item was deleted locally. Discard stale save so it never repopulates Firestore.
            await removeSyncQueueItemInternal(idb, queueItem.id);
            continue;
          }

          let itemToSave = { ...queueItem.item };

          // Try uploading primary image if it's a data URL, with strict 2.5s timeout
          if (storage && itemToSave.primaryImageUrl && itemToSave.primaryImageUrl.startsWith('data:')) {
            try {
              const blob = dataURLtoBlob(itemToSave.primaryImageUrl);
              const downloadUrl = await uploadImageSafe(storage, `items/${itemToSave.id}/${Date.now()}_primary.jpg`, blob);
              if (downloadUrl) {
                itemToSave.primaryImageUrl = downloadUrl;
              }
            } catch {
              // Proceed even if image upload is skipped
            }
          }

          // Try uploading gallery images with timeout
          if (storage && itemToSave.images && itemToSave.images.length > 0) {
            const updatedImages = [];
            for (const img of itemToSave.images) {
              if (img.url.startsWith('data:')) {
                try {
                  const blob = dataURLtoBlob(img.url);
                  const downloadUrl = await uploadImageSafe(storage, `items/${itemToSave.id}/${Date.now()}_${img.id}.jpg`, blob);
                  updatedImages.push({ ...img, url: downloadUrl || img.url });
                } catch {
                  updatedImages.push(img);
                }
              } else {
                updatedImages.push(img);
              }
            }
            itemToSave.images = updatedImages;
          }

          // Update local IndexedDB with the updated item
          await new Promise<void>((resolve, reject) => {
            const tx = idb.transaction(STORE_ITEMS, 'readwrite');
            const store = tx.objectStore(STORE_ITEMS);
            const req = store.put(itemToSave);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
          });

          // Write document to Firestore with 4.5s timeout to guarantee no hangs
          const docRef = doc(db, 'items', itemToSave.id);
          await Promise.race([
            setDoc(docRef, sanitizeForFirestore(itemToSave), { merge: true }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore write timeout (4.5s)')), 4500))
          ]);

          // Successfully written to Firestore: remove from queue
          await removeSyncQueueItemInternal(idb, queueItem.id);
          processed++;
        } else if (queueItem.action === 'delete') {
          // Delete document from Firestore with 4.5s timeout
          const docRef = doc(db, 'items', queueItem.itemId);
          await Promise.race([
            deleteDoc(docRef),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore delete timeout (4.5s)')), 4500))
          ]);

          // Ensure purged from local IndexedDB
          try {
            const tx = idb.transaction(STORE_ITEMS, 'readwrite');
            tx.objectStore(STORE_ITEMS).delete(queueItem.itemId);
          } catch {
            // ignore
          }

          await removeSyncQueueItemInternal(idb, queueItem.id);
          processed++;
        }
      } catch (itemErr: any) {
        errors++;
        console.error(`Sync error for item ${queueItem.itemId}:`, itemErr);

        // If an item has failed 2+ times, remove it from the queue so it NEVER blocks forever
        if (queueItem.retryCount >= 2) {
          console.warn(`Removing permanently failing item ${queueItem.itemId} from sync queue to prevent loop.`);
          await removeSyncQueueItemInternal(idb, queueItem.id);
        } else {
          try {
            const tx = idb.transaction(STORE_SYNC_QUEUE, 'readwrite');
            const store = tx.objectStore(STORE_SYNC_QUEUE);
            store.put({
              ...queueItem,
              retryCount: queueItem.retryCount + 1,
              lastError: itemErr?.message || String(itemErr),
            });
          } catch {
            // ignore
          }
        }
      }
    }
  } catch (fatalErr) {
    console.error('Fatal sync error:', fatalErr);
  } finally {
    isSyncing = false;
    notifyListeners();
  }

  const message = errors > 0
    ? `Synced ${processed} change(s). ${errors} items had issues.`
    : `Successfully synchronized ${processed} change(s) with Cloud Firestore.`;

  return { processed, errors, message };
}

// ---------------------------------------------------------------------------
// Sync Status Event System
// ---------------------------------------------------------------------------

type Listener = (state: SyncStatusState) => void;
const listeners = new Set<Listener>();

async function getSyncState(): Promise<SyncStatusState> {
  const pendingItems = await getPendingSyncItems();
  const pendingCount = pendingItems.length;
  const pendingItemIds = pendingItems.map((p) => p.itemId);
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  const isFirebaseActive = isFirebaseConfigured();

  return {
    pendingCount,
    pendingItemIds,
    isSyncing,
    isOnline,
    isFirebaseActive,
  };
}

async function notifyListeners() {
  const state = await getSyncState();
  listeners.forEach((listener) => {
    try {
      listener(state);
    } catch (e) {
      console.error('Error in sync listener:', e);
    }
  });
}

export function subscribeToSyncStatus(listener: Listener): () => void {
  listeners.add(listener);
  getSyncState().then((s) => listener(s));

  return () => {
    listeners.delete(listener);
  };
}

// Auto wire online & offline events in the browser
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    notifyListeners();
    processSyncQueue().catch((e) => console.warn('Sync on online event failed:', e));
  });

  window.addEventListener('offline', () => {
    notifyListeners();
  });
}
