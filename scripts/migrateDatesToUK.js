import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

// Load .env.local if present
function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim();
        process.env[key] = val;
      }
    }
  }
}

loadEnvLocal();

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || 'AIzaSyCnQ-DyjhJ4_2udoS0a1xx18lheKgRHIvY',
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'my-antiques-app',
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || 'my-antiques-app.firebaseapp.com',
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || 'my-antiques-app.firebasestorage.app',
};

function formatDateToUK(val) {
  if (!val || typeof val !== 'string') return null;
  const trimmed = val.trim();
  if (!trimmed) return null;

  // Already DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
    return trimmed;
  }

  // ISO format: YYYY-MM-DD
  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    const year = isoMatch[1];
    const month = isoMatch[2].padStart(2, '0');
    const day = isoMatch[3].padStart(2, '0');
    return `${day}/${month}/${year}`;
  }

  // Alternate formats: DD-MM-YYYY or DD.MM.YYYY
  const altMatch = trimmed.match(/^(\d{1,2})[-.](\d{1,2})[-.](\d{4})/);
  if (altMatch) {
    const day = altMatch[1].padStart(2, '0');
    const month = altMatch[2].padStart(2, '0');
    const year = altMatch[3];
    return `${day}/${month}/${year}`;
  }

  // Try parsing with Date
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    const day = String(parsed.getDate()).padStart(2, '0');
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const year = parsed.getFullYear();
    return `${day}/${month}/${year}`;
  }

  return null;
}

async function runMigration() {
  console.log('Connecting to Firebase Project:', firebaseConfig.projectId);
  const app = initializeApp(firebaseConfig, 'migration-app-' + Date.now());
  const db = getFirestore(app);

  console.log('Fetching items from Firestore collection "items"...');
  const snapshot = await getDocs(collection(db, 'items'));
  console.log(`Found ${snapshot.docs.length} items in Firestore.`);

  let updatedCount = 0;
  let alreadyCorrectCount = 0;
  let noDateCount = 0;

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    const itemId = docSnap.id;
    const title = data.title || 'Untitled Item';
    const oldAcquisitionDate = data.acquisitionDate;

    if (!oldAcquisitionDate) {
      noDateCount++;
      console.log(`- [${itemId}] "${title}": No acquisition date recorded.`);
      continue;
    }

    const ukDate = formatDateToUK(oldAcquisitionDate);

    if (ukDate && ukDate !== oldAcquisitionDate) {
      console.log(`✓ [${itemId}] "${title}": Updating "${oldAcquisitionDate}" -> "${ukDate}"`);
      await updateDoc(doc(db, 'items', itemId), {
        acquisitionDate: ukDate,
        updatedAt: Date.now(),
      });
      updatedCount++;
    } else if (ukDate === oldAcquisitionDate) {
      alreadyCorrectCount++;
      console.log(`= [${itemId}] "${title}": Already in UK format "${oldAcquisitionDate}".`);
    } else {
      console.log(`? [${itemId}] "${title}": Unrecognized date format "${oldAcquisitionDate}".`);
    }
  }

  console.log('\n=============================================');
  console.log('Migration Summary:');
  console.log(`Total items checked: ${snapshot.docs.length}`);
  console.log(`Updated to UK format (DD/MM/YYYY): ${updatedCount}`);
  console.log(`Already in UK format: ${alreadyCorrectCount}`);
  console.log(`No acquisition date: ${noDateCount}`);
  console.log('=============================================\n');
  process.exit(0);
}

runMigration().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
