import { type Category, type Item, DEFAULT_SUBCATEGORIES } from '../types/schema';
import { initFirebase, isFirebaseConfigured, sanitizeForFirestore } from './firebase';
import { doc, getDoc, setDoc, onSnapshot, type Unsubscribe } from 'firebase/firestore';

const STORAGE_KEY = 'curator_custom_subcategories';
const HIDDEN_STORAGE_KEY = 'curator_hidden_subcategories';
const METADATA_DOC_PATH = 'categories_and_subcategories';

type SubcategoryListener = () => void;
const listeners = new Set<SubcategoryListener>();

function notifySubcategoryListeners() {
  listeners.forEach((l) => {
    try {
      l();
    } catch (e) {
      console.error('Error in subcategory listener:', e);
    }
  });
}

/**
 * Register a listener that triggers whenever subcategories are added, removed, or synced from Firestore.
 */
export function subscribeToSubcategories(listener: SubcategoryListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getCustomSubcategories(): Record<string, string[]> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to parse custom subcategories:', e);
  }
  return {};
}

export function saveCustomSubcategories(data: Record<string, string[]>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save custom subcategories:', e);
  }
  notifySubcategoryListeners();
}

export function getHiddenSubcategories(): Record<string, string[]> {
  try {
    const raw = localStorage.getItem(HIDDEN_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to parse hidden subcategories:', e);
  }
  return {};
}

export function saveHiddenSubcategories(data: Record<string, string[]>): void {
  try {
    localStorage.setItem(HIDDEN_STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save hidden subcategories:', e);
  }
  notifySubcategoryListeners();
}

/**
 * Check if a subcategory was custom-added by the user (as opposed to being a system default).
 */
export function isCustomSubcategory(category: string, subcategoryName: string): boolean {
  const customMap = getCustomSubcategories();
  const list = customMap[category] || [];
  return list.some((item) => item.toLowerCase() === subcategoryName.trim().toLowerCase());
}

/**
 * Get all available subcategories for a given category (defaults + user customized + subcategories on catalog items),
 * excluding any that have been marked as hidden/deleted by the user, sorted alphabetically.
 */
export function getSubcategoriesForCategory(category: Category | string, currentItems?: Item[]): string[] {
  const defaults = (DEFAULT_SUBCATEGORIES as Record<string, string[]>)[category] || [];
  const customMap = getCustomSubcategories();
  const custom = customMap[category] || [];
  const hiddenMap = getHiddenSubcategories();
  const hidden = (hiddenMap[category] || []).map((h) => h.toLowerCase().trim());

  const combined: string[] = [];

  for (const d of defaults) {
    if (!hidden.includes(d.toLowerCase()) && !combined.some((item) => item.toLowerCase() === d.toLowerCase())) {
      combined.push(d);
    }
  }

  for (const c of custom) {
    if (!hidden.includes(c.toLowerCase()) && !combined.some((item) => item.toLowerCase() === c.toLowerCase())) {
      combined.push(c);
    }
  }

  // Also include any subcategories present on items in this category (if not hidden)
  if (currentItems && Array.isArray(currentItems)) {
    for (const item of currentItems) {
      if (item.category === category && item.subcategory && item.subcategory.trim()) {
        const sub = item.subcategory.trim();
        if (!hidden.includes(sub.toLowerCase()) && !combined.some((item) => item.toLowerCase() === sub.toLowerCase())) {
          combined.push(sub);
        }
      }
    }
  }

  return combined.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}

/**
 * Scans all items and automatically ensures that any subcategory tagged on an item
 * (e.g. "Beswick", "Lladro") is added to the custom subcategories map and synced
 * to Cloud Firestore metadata, skipping any subcategory that the user explicitly deleted.
 */
export async function syncSubcategoriesWithItems(items: Item[]): Promise<void> {
  if (!items || !Array.isArray(items) || items.length === 0) return;

  const customMap = getCustomSubcategories();
  const hiddenMap = getHiddenSubcategories();
  let hasNew = false;

  for (const item of items) {
    if (!item.category || !item.subcategory || !item.subcategory.trim()) continue;
    const cat = item.category;
    const sub = item.subcategory.trim();

    const hiddenForCat = (hiddenMap[cat] || []).map((h) => h.toLowerCase());
    if (hiddenForCat.includes(sub.toLowerCase())) continue;

    const defaults = (DEFAULT_SUBCATEGORIES as Record<string, string[]>)[cat] || [];
    const existingCustom = customMap[cat] || [];

    const inDefaults = defaults.some((d) => d.toLowerCase() === sub.toLowerCase());
    const inCustom = existingCustom.some((c) => c.toLowerCase() === sub.toLowerCase());

    if (!inDefaults && !inCustom) {
      customMap[cat] = [...existingCustom, sub];
      hasNew = true;
    }
  }

  if (hasNew) {
    saveCustomSubcategories(customMap);

    if (isFirebaseConfigured()) {
      const { db } = initFirebase();
      if (db) {
        try {
          const metaRef = doc(db, 'metadata', METADATA_DOC_PATH);
          await setDoc(metaRef, sanitizeForFirestore({
            customSubcategories: customMap,
            hiddenSubcategories: hiddenMap,
            defaultSubcategories: DEFAULT_SUBCATEGORIES,
            updatedAt: Date.now(),
          }), { merge: true });
        } catch (err) {
          console.warn('Could not sync item subcategories to Firestore metadata:', err);
        }
      }
    }
  }
}

/**
 * Get only user custom subcategories for a category, sorted alphabetically.
 */
export function getCustomSubcategoriesForCategory(category: Category | string): string[] {
  const customMap = getCustomSubcategories();
  const hiddenMap = getHiddenSubcategories();
  const hidden = (hiddenMap[category] || []).map((h) => h.toLowerCase());
  const list = (customMap[category] || []).filter((c) => !hidden.includes(c.toLowerCase()));
  return [...list].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}

/**
 * Add a new user-defined subcategory for a category.
 * If previously hidden, unhides it.
 * Persists locally and automatically synchronizes to Cloud Firestore.
 */
export async function addUserSubcategory(category: Category | string, subcategoryName: string): Promise<string[]> {
  const trimmed = subcategoryName.trim();
  if (!trimmed) return getSubcategoriesForCategory(category);

  // 1. Un-hide if previously hidden
  const hiddenMap = getHiddenSubcategories();
  const hiddenForCat = hiddenMap[category] || [];
  let hiddenChanged = false;
  if (hiddenForCat.some((h) => h.toLowerCase() === trimmed.toLowerCase())) {
    hiddenMap[category] = hiddenForCat.filter((h) => h.toLowerCase() !== trimmed.toLowerCase());
    saveHiddenSubcategories(hiddenMap);
    hiddenChanged = true;
  }

  const customMap = getCustomSubcategories();
  const existingForCat = customMap[category] || [];

  // Check if it already exists in defaults
  const defaults = (DEFAULT_SUBCATEGORIES as Record<string, string[]>)[category] || [];
  const alreadyInDefaults = defaults.some((d) => d.toLowerCase() === trimmed.toLowerCase());
  const alreadyInCustom = existingForCat.some((c) => c.toLowerCase() === trimmed.toLowerCase());

  let customChanged = false;
  if (!alreadyInCustom && !alreadyInDefaults) {
    customMap[category] = [...existingForCat, trimmed];
    saveCustomSubcategories(customMap);
    customChanged = true;
  }

  if (hiddenChanged || customChanged) {
    if (isFirebaseConfigured()) {
      const { db } = initFirebase();
      if (db) {
        try {
          const metaRef = doc(db, 'metadata', METADATA_DOC_PATH);
          await setDoc(metaRef, sanitizeForFirestore({
            customSubcategories: customMap,
            hiddenSubcategories: hiddenMap,
            defaultSubcategories: DEFAULT_SUBCATEGORIES,
            updatedAt: Date.now(),
          }), { merge: true });
        } catch (err) {
          console.warn('Could not sync custom subcategory to Firestore immediately:', err);
        }
      }
    }
  }

  return getSubcategoriesForCategory(category);
}

/**
 * Remove a subcategory (both custom and defaults).
 * Marks the subcategory as hidden so it will not reappear from defaults or item syncs.
 * Persists locally and syncs removal to Cloud Firestore.
 */
export async function removeUserSubcategory(category: Category | string, subcategoryName: string): Promise<string[]> {
  const trimmed = subcategoryName.trim();
  if (!trimmed) return getSubcategoriesForCategory(category);

  // 1. Remove from custom subcategories if present
  const customMap = getCustomSubcategories();
  const existingForCat = customMap[category] || [];
  customMap[category] = existingForCat.filter(
    (c) => c.toLowerCase() !== trimmed.toLowerCase()
  );
  saveCustomSubcategories(customMap);

  // 2. Add to hidden subcategories blacklist
  const hiddenMap = getHiddenSubcategories();
  const existingHidden = hiddenMap[category] || [];
  if (!existingHidden.some((h) => h.toLowerCase() === trimmed.toLowerCase())) {
    hiddenMap[category] = [...existingHidden, trimmed];
    saveHiddenSubcategories(hiddenMap);
  }

  // 3. Sync update to Firestore
  if (isFirebaseConfigured()) {
    const { db } = initFirebase();
    if (db) {
      try {
        const metaRef = doc(db, 'metadata', METADATA_DOC_PATH);
        await setDoc(metaRef, sanitizeForFirestore({
          customSubcategories: customMap,
          hiddenSubcategories: hiddenMap,
          defaultSubcategories: DEFAULT_SUBCATEGORIES,
          updatedAt: Date.now(),
        }), { merge: true });
      } catch (err) {
        console.warn('Could not sync subcategory removal to Firestore:', err);
      }
    }
  }

  return getSubcategoriesForCategory(category);
}

/**
 * Initializes real-time listener for categories and subcategories stored in Firestore.
 * Ensures any categories/subcategories added or removed by another user or session are promulgated in real-time.
 */
export function initSubcategoriesSync(): Unsubscribe | null {
  if (!isFirebaseConfigured()) return null;
  const { db } = initFirebase();
  if (!db) return null;

  try {
    const metaRef = doc(db, 'metadata', METADATA_DOC_PATH);

    // 1. One-time check to ensure metadata doc exists with defaults
    getDoc(metaRef).then((snap) => {
      if (!snap.exists()) {
        setDoc(metaRef, sanitizeForFirestore({
          defaultSubcategories: DEFAULT_SUBCATEGORIES,
          customSubcategories: getCustomSubcategories(),
          hiddenSubcategories: getHiddenSubcategories(),
          updatedAt: Date.now(),
        }), { merge: true }).catch((e) => console.warn('Could not seed metadata subcategories:', e));
      }
    }).catch(() => {});

    // 2. Realtime listener for remote changes
    return onSnapshot(metaRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        const remoteHidden = data?.hiddenSubcategories || {};
        const localHidden = getHiddenSubcategories();
        const mergedHidden: Record<string, string[]> = { ...localHidden };
        let hiddenChanged = false;

        for (const [cat, rList] of Object.entries(remoteHidden)) {
          if (Array.isArray(rList)) {
            const cList = mergedHidden[cat] || [];
            const combined = [...cList];
            for (const item of rList) {
              if (typeof item === 'string' && !combined.some((h) => h.toLowerCase() === item.toLowerCase())) {
                combined.push(item);
                hiddenChanged = true;
              }
            }
            mergedHidden[cat] = combined;
          }
        }

        if (hiddenChanged) {
          try {
            localStorage.setItem(HIDDEN_STORAGE_KEY, JSON.stringify(mergedHidden));
          } catch (e) {
            console.warn('Failed to update local hidden subcategories from remote snapshot:', e);
          }
        }

        const remoteCustom = data?.customSubcategories || {};
        const localCustom = getCustomSubcategories();
        const merged: Record<string, string[]> = { ...localCustom };
        let customChanged = false;

        for (const [cat, remoteList] of Object.entries(remoteCustom)) {
          if (Array.isArray(remoteList)) {
            const catHidden = (mergedHidden[cat] || []).map((h) => h.toLowerCase());
            const currentList = (merged[cat] || []).filter((c) => !catHidden.includes(c.toLowerCase()));
            const combinedList = [...currentList];
            for (const item of remoteList) {
              if (
                typeof item === 'string' &&
                !catHidden.includes(item.toLowerCase()) &&
                !combinedList.some((c) => c.toLowerCase() === item.toLowerCase())
              ) {
                combinedList.push(item);
                customChanged = true;
              }
            }
            merged[cat] = combinedList;
          }
        }

        if (customChanged || hiddenChanged) {
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
            notifySubcategoryListeners();
          } catch (e) {
            console.warn('Failed to update local subcategories from remote snapshot:', e);
          }
        }
      }
    }, (err) => {
      console.warn('Categories/Subcategories real-time sync listener error:', err);
    });
  } catch (err) {
    console.warn('Failed to attach categories sync listener:', err);
    return null;
  }
}
