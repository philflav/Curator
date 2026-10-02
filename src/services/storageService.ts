import type { Item } from '../types/schema';
import { initFirebase, isFirebaseConfigured, sanitizeForFirestore } from './firebase';
import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  deleteDoc, 
  query, 
  orderBy,
  onSnapshot,
  type Unsubscribe 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { 
  openIDB, 
  STORE_ITEMS, 
  enqueueSyncAction, 
  getPendingSyncItems, 
  clearSyncQueue,
  cancelPendingSyncForItem
} from './syncService';

const LOCAL_STORAGE_KEY = 'curator_local_items_db';

// High quality initial demonstration items
const INITIAL_DEMO_ITEMS: Item[] = [
  {
    id: 'item-001',
    title: 'Royal Doulton "The Old Balloon Seller" Figurine',
    category: 'Ceramics & Porcelain',
    subcategory: 'Doulton Lambeth',
    maker: 'Royal Doulton',
    modelOrPattern: 'HN 1315',
    periodOrYear: 'c. 1940',
    condition: 'Excellent',
    conditionNotes: 'No chips, cracks, or crazing. Vibrant enamel paint.',
    dimensions: {
      height: 19.5,
      width: 13,
      depth: 11,
      unit: 'cm',
    },
    acquisitionDate: '2023-05-14',
    acquisitionCost: 45,
    acquisitionLocation: 'Portobello Road Market, London',
    currency: 'GBP',
    estimatedValue: 120,
    description: 'Charming vintage Royal Doulton bone china figurine depicting an elderly balloon seller in a green shawl and purple skirt holding a colorful bunch of balloons. Exceptionally detailed hand-painted face and costume.',
    notes: 'Designed by Leslie Harradine. Full Royal Doulton lion and crown backstamp on underside with green printed registration marks.',
    primaryImageUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=800&q=80',
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 30,
    updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 5,
  },
  {
    id: 'item-002',
    title: 'Victorian Mahogany Fusee Bracket Clock',
    category: 'Clocks & Watches',
    subcategory: 'Bracket Clocks',
    maker: 'James McCabe, Royal Exchange London',
    modelOrPattern: 'Arch-Top Bracket Clock No. 2481',
    periodOrYear: 'c. 1860',
    condition: 'Good',
    conditionNotes: 'Movement cleaned and oiled. Minor patina on brass bezel.',
    dimensions: {
      height: 38,
      width: 25,
      depth: 17,
      unit: 'cm',
    },
    acquisitionDate: '2021-11-20',
    acquisitionCost: 650,
    acquisitionLocation: "Christie's South Kensington, Fine Clocks Sale",
    currency: 'GBP',
    estimatedValue: 1450,
    description: 'A handsome Victorian flame mahogany bracket clock of classic arch-top form with brass sound frets and carrying handles. Eight-day twin fusee movement with engraved backplate striking the hours on a coiled gong.',
    notes: '8-day twin fusee movement striking the hours on a coiled gong. Signed silvered dial with Roman numerals.',
    primaryImageUrl: 'https://images.unsplash.com/photo-1508057198894-247b23fe5ade?auto=format&fit=crop&w=800&q=80',
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 60,
    updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 10,
  },
  {
    id: 'item-003',
    title: 'Lalique France Frosted Crystal "Daphne" Powder Box',
    category: 'Glass',
    subcategory: 'Art Glass',
    maker: 'René Lalique / Lalique France',
    modelOrPattern: 'Daphne No. 514',
    periodOrYear: 'c. 1955',
    condition: 'Mint',
    conditionNotes: 'Pristine frosted medallion with clear polished crystal base. Signed Lalique France in script.',
    dimensions: {
      height: 5.5,
      width: 7.5,
      depth: 7.5,
      unit: 'cm',
    },
    acquisitionDate: '2024-01-15',
    acquisitionCost: 180,
    acquisitionLocation: 'Drouot Auction House, Paris',
    currency: 'GBP',
    estimatedValue: 380,
    description: 'Heavy circular lead crystal lidded vanity box. The circular lid features a high relief frosted medallion showing Daphne emerging from foliage, surrounded by a polished rim.',
    notes: 'Cover depicts the nymph Daphne in repoussé frosted crystal. Wheel-cut signature on base.',
    primaryImageUrl: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=800&q=80',
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 12,
    updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 2,
  },
  {
    id: 'item-004',
    title: 'Art Deco Silver & Enamel Cigarette Case',
    category: 'Metalware',
    subcategory: 'Silver & Silverplate',
    maker: 'Adie Brothers Ltd, Birmingham',
    modelOrPattern: 'Sunburst Guilloché',
    periodOrYear: '1934',
    condition: 'Excellent',
    conditionNotes: 'Enamel completely intact without fleabites. Gold-washed interior.',
    dimensions: {
      height: 8.5,
      width: 7,
      depth: 1.2,
      unit: 'cm',
    },
    acquisitionDate: '2023-09-02',
    acquisitionCost: 220,
    acquisitionLocation: 'Bermondsey Antiques Square, London',
    currency: 'GBP',
    estimatedValue: 450,
    description: 'Streamlined Art Deco sterling silver pocket case with radiant engine-turned sunburst pattern beneath translucent royal cobalt blue vitreous enamel. Push-button thumbpiece with original gilded interior and elastic strap.',
    notes: 'Deep cobalt blue translucent guilloché enamel over sterling silver. Hallmarked Birmingham 1934.',
    primaryImageUrl: 'https://images.unsplash.com/photo-1533158326339-7f3cf2404354?auto=format&fit=crop&w=800&q=80',
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 40,
    updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 1,
  },
  {
    id: 'item-005',
    title: 'George III Chippendale Mahogany Bureau Bookcase',
    category: 'Furniture',
    subcategory: 'Cabinets & Bookcases',
    maker: 'Attributed to Thomas Chippendale School',
    modelOrPattern: 'Astragal Glazed Bureau Bookcase',
    periodOrYear: 'c. 1775',
    condition: 'Good',
    conditionNotes: 'Original brass swan-neck handles and escutcheons. Fine age-worn wax patina.',
    dimensions: {
      height: 215,
      width: 108,
      depth: 56,
      unit: 'cm',
    },
    acquisitionDate: '2022-03-10',
    acquisitionCost: 1850,
    acquisitionLocation: 'Stamford Antique Centre, Lincolnshire',
    currency: 'GBP',
    estimatedValue: 3400,
    description: 'Imposing George III period mahogany bureau bookcase in rich Cuban flame mahogany. Upper bookcase section with dentil cornice and geometric astragal glazing over a slant front writing fall enclosing pigeonholes, miniature drawers, and central cupboard.',
    notes: 'Dentil molded cornice above astragal glazed doors enclosing adjustable shelves. Slope opening to fitted interior above four graduated long drawers on bracket feet.',
    primaryImageUrl: 'https://images.unsplash.com/photo-1538688525198-9b88f6f53126?auto=format&fit=crop&w=800&q=80',
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 50,
    updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 3,
  },
  {
    id: 'item-006',
    title: 'Moorcroft "Pomegranate" Pattern Baluster Vase',
    category: 'Ceramics & Porcelain',
    subcategory: 'Moorcroft',
    maker: 'William Moorcroft',
    modelOrPattern: 'Pomegranate on Ochre Ground',
    periodOrYear: 'c. 1918',
    condition: 'Mint',
    conditionNotes: 'Exceptional tubeline definition, rich deep glazes, completely free of restoration or cracks.',
    dimensions: {
      height: 22,
      width: 12.5,
      depth: 12.5,
      unit: 'cm',
    },
    acquisitionDate: '2023-10-18',
    acquisitionCost: 320,
    acquisitionLocation: 'Newark International Antiques Fair',
    currency: 'GBP',
    estimatedValue: 680,
    description: 'Early Moorcroft baluster vase tubeline-decorated with whole and sliced pomegranates and trailing berries against a graded cobalt and ochre ground. Full green painted signature and impressed marks to base.',
    notes: 'Full William Moorcroft signature in green slip, impressed "MOORCROFT BURSLEM ENGLAND".',
    primaryImageUrl: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=800&q=80',
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 18,
    updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 4,
  },
  {
    id: 'item-007',
    title: 'Japanese Meiji Period Imari Porcelain Charger',
    category: 'Ceramics & Porcelain',
    subcategory: 'Japanese',
    maker: 'Arita Kilns, Meiji Era',
    modelOrPattern: 'Scalloped Floral & Phoenix Charger',
    periodOrYear: 'c. 1890',
    condition: 'Excellent',
    conditionNotes: 'Flawless gilding and rich underglaze blue and overglaze iron-red enamel.',
    dimensions: {
      height: 5.2,
      width: 37,
      depth: 37,
      unit: 'cm',
    },
    acquisitionDate: '2023-08-05',
    acquisitionCost: 280,
    acquisitionLocation: 'Kyoto Antiques Market, Japan',
    currency: 'GBP',
    estimatedValue: 550,
    description: 'Substantial Japanese Meiji era porcelain charger with fluted scalloped rim. Decorated in vivid underglaze blue, iron-red, and gilt depicting a central medallion with garden terrace surrounded by alternating panels of phoenix birds and chrysanthemums.',
    notes: 'Underglaze blue spur marks on foot rim. Six-character pseudo-Ming mark on reverse as typical for high Meiji export wares.',
    primaryImageUrl: 'https://images.unsplash.com/photo-1615529182904-14819c35db37?auto=format&fit=crop&w=800&q=80',
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 22,
    updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 2,
  }
];

// ---------------------------------------------------------------------------
// IndexedDB Direct Operations
// ---------------------------------------------------------------------------

export async function getIDBItems(): Promise<Item[]> {
  try {
    const db = await openIDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_ITEMS, 'readonly');
      const store = tx.objectStore(STORE_ITEMS);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result as Item[]);
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.warn('IndexedDB read failed, falling back to localStorage:', e);
    return getLocalItems();
  }
}

export async function saveIDBItem(item: Item): Promise<void> {
  try {
    const db = await openIDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_ITEMS, 'readwrite');
      const store = tx.objectStore(STORE_ITEMS);
      const request = store.put(item);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.warn('IndexedDB write failed:', e);
  }
}

export async function deleteIDBItem(itemId: string): Promise<void> {
  try {
    const db = await openIDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_ITEMS, 'readwrite');
      const store = tx.objectStore(STORE_ITEMS);
      const request = store.delete(itemId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.warn('IndexedDB delete failed:', e);
  }
}

// ---------------------------------------------------------------------------
// LocalStorage Fallback Helpers
// ---------------------------------------------------------------------------

function getLocalItems(): Item[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Error reading local items:', e);
  }
  return [];
}

function saveLocalItems(items: Item[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
  } catch (e) {
    console.warn('localStorage quota reached, persisted safely in IndexedDB:', e);
  }
}

// ---------------------------------------------------------------------------
// Fetch All Items (Offline First + Firestore Master Synchronization)
// ---------------------------------------------------------------------------

export async function fetchAllItems(): Promise<Item[]> {
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  const firebaseConfigured = isFirebaseConfigured();

  // 1. Immediately read from IndexedDB for instant UI response
  let idbItems = await getIDBItems();

  // In purely local mode (when Firebase is not configured):
  // Seed demo items ONLY on first app launch if never initialized before.
  if (!firebaseConfigured) {
    const initialized = localStorage.getItem('curator_catalog_initialized');
    if (!initialized && (!idbItems || idbItems.length === 0)) {
      for (const item of INITIAL_DEMO_ITEMS) {
        await saveIDBItem(item);
      }
      idbItems = [...INITIAL_DEMO_ITEMS];
      saveLocalItems(idbItems);
      localStorage.setItem('curator_catalog_initialized', 'true');
    }
    return idbItems.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  // 2. When Firebase IS configured and online, synchronize with Cloud Firestore (Master)
  if (isOnline) {
    const { db } = initFirebase();
    if (db) {
      try {
        const q = query(collection(db, 'items'), orderBy('updatedAt', 'desc'));
        const snapshot = await getDocs(q);
        const remoteItems: Item[] = [];
        snapshot.forEach((docSnapshot) => {
          remoteItems.push({ ...docSnapshot.data(), id: docSnapshot.id } as Item);
        });

        // Query pending sync queue actions
        const pendingQueue = await getPendingSyncItems();
        const pendingDeleteIds = new Set(
          pendingQueue.filter((qItem) => qItem.action === 'delete').map((qItem) => qItem.itemId)
        );
        const pendingSaveIds = new Set(
          pendingQueue.filter((qItem) => qItem.action === 'save').map((qItem) => qItem.itemId)
        );

        const remoteIdMap = new Map(remoteItems.map((r) => [r.id, r]));

        // Step A: Purge local items that no longer exist in Firestore (the master),
        // UNLESS the item was newly created locally while offline (in pendingSaveIds).
        // Also remove any item that is marked for pending deletion.
        for (const localItem of idbItems) {
          if (pendingDeleteIds.has(localItem.id)) {
            await deleteIDBItem(localItem.id);
          } else if (!remoteIdMap.has(localItem.id) && !pendingSaveIds.has(localItem.id)) {
            // Item was deleted on Firebase master or is an obsolete local demo item
            await deleteIDBItem(localItem.id);
          }
        }

        // Step B: Update local items from Firestore master
        for (const remoteItem of remoteItems) {
          // If pending deletion on this device, do NOT resurrect it locally
          if (pendingDeleteIds.has(remoteItem.id)) {
            continue;
          }
          // If pending local save, keep pending local version
          if (pendingSaveIds.has(remoteItem.id)) {
            continue;
          }
          await saveIDBItem(remoteItem);
        }

        // Step C: Re-read clean reconciled IndexedDB items
        idbItems = await getIDBItems();
        // Ensure no pending deletes slipped through
        idbItems = idbItems.filter((item) => !pendingDeleteIds.has(item.id));

        // Keep localStorage fallback cache synchronized with reconciled master
        saveLocalItems(idbItems);
        localStorage.setItem('curator_catalog_initialized', 'true');
      } catch (e) {
        console.warn('Could not refresh from Cloud Firestore, using local cache:', e);
      }
    }
  }

  return idbItems.sort((a, b) => b.updatedAt - a.updatedAt);
}

// ---------------------------------------------------------------------------
// Realtime Firestore Subscription (Master -> Local Consistency)
// ---------------------------------------------------------------------------

export function subscribeToRemoteItems(onUpdate: (items: Item[]) => void): Unsubscribe | null {
  if (!isFirebaseConfigured()) return null;
  const { db } = initFirebase();
  if (!db) return null;

  try {
    const q = query(collection(db, 'items'), orderBy('updatedAt', 'desc'));
    return onSnapshot(q, async (snapshot) => {
      const pendingQueue = await getPendingSyncItems();
      const pendingDeleteIds = new Set(
        pendingQueue.filter((qItem) => qItem.action === 'delete').map((qItem) => qItem.itemId)
      );
      const pendingSaveIds = new Set(
        pendingQueue.filter((qItem) => qItem.action === 'save').map((qItem) => qItem.itemId)
      );

      const remoteItems: Item[] = [];
      const remoteIdMap = new Map<string, Item>();
      for (const docSnapshot of snapshot.docs) {
        const remoteItem = { ...docSnapshot.data(), id: docSnapshot.id } as Item;
        remoteItems.push(remoteItem);
        remoteIdMap.set(remoteItem.id, remoteItem);
      }

      // Check current local IDB items
      const currentLocal = await getIDBItems();

      // Prune local items that were deleted from Firestore
      for (const localItem of currentLocal) {
        if (pendingDeleteIds.has(localItem.id)) {
          await deleteIDBItem(localItem.id);
        } else if (!remoteIdMap.has(localItem.id) && !pendingSaveIds.has(localItem.id)) {
          await deleteIDBItem(localItem.id);
        }
      }

      // Update / save items from remote snapshot
      for (const remoteItem of remoteItems) {
        if (pendingDeleteIds.has(remoteItem.id) || pendingSaveIds.has(remoteItem.id)) {
          continue;
        }
        await saveIDBItem(remoteItem);
      }

      let latest = await getIDBItems();
      latest = latest.filter((item) => !pendingDeleteIds.has(item.id));
      saveLocalItems(latest);

      onUpdate(latest.sort((a, b) => b.updatedAt - a.updatedAt));
    }, (error) => {
      console.warn('Firestore real-time subscription error:', error);
    });
  } catch (err) {
    console.warn('Failed to initialize Firestore snapshot listener:', err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Save Item (Optimistic Local + Automatic Sync Queue)
// ---------------------------------------------------------------------------

export async function saveItem(item: Item): Promise<Item> {
  const updatedItem: Item = {
    ...item,
    updatedAt: Date.now(),
  };

  // 1. Immediately persist to IndexedDB
  await saveIDBItem(updatedItem);

  // 2. Also update localStorage cache
  const localItems = getLocalItems();
  const index = localItems.findIndex((i) => i.id === updatedItem.id);
  if (index >= 0) {
    localItems[index] = updatedItem;
  } else {
    localItems.unshift(updatedItem);
  }
  saveLocalItems(localItems);
  localStorage.setItem('curator_catalog_initialized', 'true');

  // 3. Attempt direct write to Firestore if online
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  const { db, isConfigured } = initFirebase();

  if (isOnline && isConfigured && db) {
    try {
      const docRef = doc(db, 'items', updatedItem.id);
      await Promise.race([
        setDoc(docRef, sanitizeForFirestore(updatedItem), { merge: true }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore write timeout (4s)')), 4000))
      ]);
      // Successfully written directly: clear any sync queue entry for this item
      await cancelPendingSyncForItem(updatedItem.id);
      return updatedItem;
    } catch (err) {
      console.warn('Firestore write failed, enqueuing for background sync:', err);
      await enqueueSyncAction('save', updatedItem);
    }
  } else if (isConfigured) {
    // Configured but offline: enqueue for sync
    await enqueueSyncAction('save', updatedItem);
  }

  return updatedItem;
}

// ---------------------------------------------------------------------------
// Delete Item (Optimistic Local + Complete Sync Cancellation & Queue)
// ---------------------------------------------------------------------------

export async function deleteItem(itemId: string): Promise<void> {
  // 1. Immediately remove from local IndexedDB
  await deleteIDBItem(itemId);

  // 2. Immediately remove from localStorage fallback
  const localItems = getLocalItems();
  const filtered = localItems.filter((i) => i.id !== itemId);
  saveLocalItems(filtered);

  // 3. CRUCIAL: Cancel any pending 'save' for this item in the sync queue!
  // This prevents any queued save action from resurrecting the item in IDB or Firebase later.
  await cancelPendingSyncForItem(itemId);

  // 4. Handle Firestore delete
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  const { db, isConfigured } = initFirebase();

  if (isConfigured) {
    if (isOnline && db) {
      try {
        await Promise.race([
          deleteDoc(doc(db, 'items', itemId)),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore delete timeout (4s)')), 4000))
        ]);
        // Successfully deleted from Firestore: cancel any delete queue items if present
        await cancelPendingSyncForItem(itemId);
        return;
      } catch (err) {
        console.warn('Firestore delete failed or timed out, enqueuing for background sync:', err);
        await enqueueSyncAction('delete', undefined, itemId);
      }
    } else {
      // Offline: enqueue delete action for when back online
      await enqueueSyncAction('delete', undefined, itemId);
    }
  }
}

// ---------------------------------------------------------------------------
// Upload Item Image (Cloud Storage with Local Data URL Fallback)
// ---------------------------------------------------------------------------

export async function uploadItemImage(itemId: string, blob: Blob, fileName: string): Promise<string> {
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  const { storage, isConfigured } = initFirebase();

  if (isOnline && isConfigured && storage) {
    try {
      const storageRef = ref(storage, `items/${itemId}/${Date.now()}_${fileName}`);
      const uploadPromise = uploadBytes(storageRef, blob).then((res) => getDownloadURL(res.ref));
      const downloadUrl = await Promise.race([
        uploadPromise,
        new Promise<string>((_, reject) => setTimeout(() => reject(new Error('Storage timeout')), 2500))
      ]);
      return downloadUrl;
    } catch (e) {
      console.warn('Firebase Storage unavailable or timed out, saving as local Data URL:', e);
    }
  }

  // Fallback: convert blob to base64 Data URL for offline operation
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read blob for local storage'));
    reader.readAsDataURL(blob);
  });
}

// ---------------------------------------------------------------------------
// Reset Demo Catalog
// ---------------------------------------------------------------------------

export async function clearAndReseedIDB(items: Item[] = INITIAL_DEMO_ITEMS): Promise<Item[]> {
  try {
    const db = await openIDB();
    
    // Clear items store
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_ITEMS, 'readwrite');
      const store = tx.objectStore(STORE_ITEMS);
      const clearReq = store.clear();
      clearReq.onsuccess = () => resolve();
      clearReq.onerror = () => reject(clearReq.error);
    });

    // Seed new items
    for (const item of items) {
      await saveIDBItem(item);
    }

    // Clear sync queue
    await clearSyncQueue();

    // Reset localStorage
    saveLocalItems(items);
    localStorage.setItem('curator_catalog_initialized', 'true');
    return items;
  } catch (err) {
    console.error('Error resetting IndexedDB:', err);
    saveLocalItems(items);
    localStorage.setItem('curator_catalog_initialized', 'true');
    return items;
  }
}

export function resetDemoData(): Item[] {
  clearAndReseedIDB(INITIAL_DEMO_ITEMS).catch((e) => console.error(e));
  return INITIAL_DEMO_ITEMS;
}
