import { type Category, DEFAULT_SUBCATEGORIES } from '../types/schema';
import { initFirebase, isFirebaseConfigured, sanitizeForFirestore } from './firebase';
import { doc, getDoc, setDoc, onSnapshot, type Unsubscribe } from 'firebase/firestore';

const STORAGE_KEY = 'curator_custom_subcategories';
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

/**
 * Check if a subcategory was custom-added by the user (as opposed to being a system default).
 */
export function isCustomSubcategory(category: string, subcategoryName: string): boolean {
  const customMap = getCustomSubcategories();
  const list = customMap[category] || [];
  return list.some((item) => item.toLowerCase() === subcategoryName.trim().toLowerCase());
}

/**
 * Get all available subcategories for a given category (defaults + user customized), sorted alphabetically.
 */
export function getSubcategoriesForCategory(category: Category | string): string[] {
  const defaults = (DEFAULT_SUBCATEGORIES as Record<string, string[]>)[category] || [];
  const customMap = getCustomSubcategories();
  const custom = customMap[category] || [];

  const combined = [...defaults];
  for (const c of custom) {
    if (!combined.some((item) => item.toLowerCase() === c.toLowerCase())) {
      combined.push(c);
    }
  }
  return combined.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}

/**
 * Get only user custom subcategories for a category, sorted alphabetically.
 */
export function getCustomSubcategoriesForCategory(category: Category | string): string[] {
  const customMap = getCustomSubcategories();
  const list = customMap[category] || [];
  return [...list].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}

/**
 * Add a new user-defined subcategory for a category.
 * Persists locally and automatically synchronizes to Cloud Firestore for cross-client promulgation.
 */
export async function addUserSubcategory(category: Category | string, subcategoryName: string): Promise<string[]> {
  const trimmed = subcategoryName.trim();
  if (!trimmed) return getSubcategoriesForCategory(category);

  const customMap = getCustomSubcategories();
  const existingForCat = customMap[category] || [];

  // Check if it already exists in defaults
  const defaults = (DEFAULT_SUBCATEGORIES as Record<string, string[]>)[category] || [];
  const alreadyInDefaults = defaults.some((d) => d.toLowerCase() === trimmed.toLowerCase());
  const alreadyInCustom = existingForCat.some((c) => c.toLowerCase() === trimmed.toLowerCase());

  if (!alreadyInCustom && !alreadyInDefaults) {
    customMap[category] = [...existingForCat, trimmed];
    saveCustomSubcategories(customMap);

    // Sync to Firestore metadata collection
    if (isFirebaseConfigured()) {
      const { db } = initFirebase();
      if (db) {
        try {
          const metaRef = doc(db, 'metadata', METADATA_DOC_PATH);
          await setDoc(metaRef, sanitizeForFirestore({
            customSubcategories: customMap,
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
 * Remove a custom subcategory (defaults cannot be permanently deleted, but custom ones can).
 * Persists locally and syncs removal to Cloud Firestore.
 */
export async function removeUserSubcategory(category: Category | string, subcategoryName: string): Promise<string[]> {
  const customMap = getCustomSubcategories();
  const existingForCat = customMap[category] || [];
  customMap[category] = existingForCat.filter(
    (c) => c.toLowerCase() !== subcategoryName.trim().toLowerCase()
  );
  saveCustomSubcategories(customMap);

  // Sync update to Firestore
  if (isFirebaseConfigured()) {
    const { db } = initFirebase();
    if (db) {
      try {
        const metaRef = doc(db, 'metadata', METADATA_DOC_PATH);
        await setDoc(metaRef, sanitizeForFirestore({
          customSubcategories: customMap,
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
 * Ensures any categories/subcategories added by another user or session are promulgated in real-time.
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
          updatedAt: Date.now(),
        }), { merge: true }).catch((e) => console.warn('Could not seed metadata subcategories:', e));
      }
    }).catch(() => {});

    // 2. Realtime listener for remote changes
    return onSnapshot(metaRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        const remoteCustom = data?.customSubcategories || {};
        const localCustom = getCustomSubcategories();

        // Merge remote custom subcategories into local
        const merged: Record<string, string[]> = { ...localCustom };
        let hasChanges = false;

        for (const [cat, remoteList] of Object.entries(remoteCustom)) {
          if (Array.isArray(remoteList)) {
            const currentList = merged[cat] || [];
            const combinedList = [...currentList];
            for (const item of remoteList) {
              if (typeof item === 'string' && !combinedList.some((c) => c.toLowerCase() === item.toLowerCase())) {
                combinedList.push(item);
                hasChanges = true;
              }
            }
            merged[cat] = combinedList;
          }
        }

        if (hasChanges) {
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
