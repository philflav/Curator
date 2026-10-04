import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyCnQ-DyjhJ4_2udoS0a1xx18lheKgRHIvY',
  projectId: 'my-antiques-app',
  authDomain: 'my-antiques-app.firebaseapp.com',
  storageBucket: 'my-antiques-app.firebasestorage.app',
};

async function migrate() {
  console.log('--- Starting Firestore Item ID Shortening Migration ---');
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  const snap = await getDocs(collection(db, 'items'));
  console.log(`Found ${snap.size} total items in Firestore.`);

  if (snap.empty) {
    console.log('No items to migrate.');
    process.exit(0);
  }

  // Collect documents
  const items = [];
  snap.forEach((docSnap) => {
    const data = docSnap.data();
    items.push({
      oldDocId: docSnap.id,
      data,
      createdAt: data.createdAt || 0,
      updatedAt: data.updatedAt || 0,
    });
  });

  // Sort by createdAt ascending (oldest first so item-0001 is earliest item)
  items.sort((a, b) => {
    if (a.createdAt !== b.createdAt) {
      return a.createdAt - b.createdAt;
    }
    return (a.data.title || '').localeCompare(b.data.title || '');
  });

  console.log('Item chronological order:');
  const mapping = [];
  for (let i = 0; i < items.length; i++) {
    const num = i + 1;
    const targetId = `item-${String(num).padStart(4, '0')}`;
    items[i].targetId = targetId;
    mapping.push({
      index: num,
      oldId: items[i].oldDocId,
      newId: targetId,
      title: items[i].data.title,
    });
  }

  console.table(mapping);

  // Write new documents and delete old documents if ID changed
  for (const item of items) {
    const { oldDocId, targetId, data } = item;
    const updatedData = {
      ...data,
      id: targetId,
    };

    if (oldDocId !== targetId) {
      console.log(`Migrating ${oldDocId} -> ${targetId}: "${data.title}"`);
      // 1. Create new doc
      await setDoc(doc(db, 'items', targetId), updatedData);
      // 2. Delete old doc
      await deleteDoc(doc(db, 'items', oldDocId));
    } else {
      console.log(`Updating in-place ${targetId}: "${data.title}"`);
      await setDoc(doc(db, 'items', targetId), updatedData, { merge: true });
    }
  }

  console.log('\n--- Migration complete. Verifying Firestore collection... ---');
  const verifySnap = await getDocs(collection(db, 'items'));
  console.log(`Verified count: ${verifySnap.size}`);
  verifySnap.docs
    .sort((a, b) => a.id.localeCompare(b.id))
    .forEach((d) => {
      console.log(`[${d.id}] ${d.data().title}`);
    });

  console.log('\nAll items successfully migrated to short 4-digit unique IDs!');
  process.exit(0);
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
