import { collection, doc, getDocs, setDoc, getDoc, writeBatch } from 'firebase/firestore';
import { db } from './firebase';

export async function fetchCollection<T>(collectionName: string): Promise<T[]> {
  try {
    const snapshot = await getDocs(collection(db, collectionName));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
  } catch (err) {
    console.error(`Error fetching ${collectionName} from Firestore`, err);
    return [];
  }
}

export async function saveDocument<T extends { id?: string }>(collectionName: string, data: T): Promise<void> {
  if (!data.id) return;
  try {
    await setDoc(doc(db, collectionName, data.id), data, { merge: true });
  } catch (err) {
    console.error(`Error saving to ${collectionName}`, err);
  }
}

export async function saveMultipleDocuments<T extends { id?: string }>(collectionName: string, items: T[]): Promise<void> {
  if (!items.length) return;
  try {
    const batch = writeBatch(db);
    items.forEach(item => {
      if (item.id) {
        const ref = doc(db, collectionName, item.id);
        batch.set(ref, item, { merge: true });
      }
    });
    await batch.commit();
  } catch (err) {
    console.error(`Error batch saving ${collectionName}`, err);
  }
}

export async function fetchDocument<T>(collectionName: string, id: string): Promise<T | null> {
  try {
    const document = await getDoc(doc(db, collectionName, id));
    if (document.exists()) {
      return { id: document.id, ...document.data() } as T;
    }
  } catch (err) {
    console.error(`Error fetching document ${id} from ${collectionName}`, err);
  }
  return null;
}
