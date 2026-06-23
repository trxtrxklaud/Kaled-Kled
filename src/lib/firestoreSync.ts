import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { db, storage, SCHOOL_ID } from './firebase';

// ═══════════════════════════════════════════════════════════════════
// Firestore + Storage real-time sync layer (document-per-collection)
//
// Two storage strategies, chosen automatically per collection key:
//
//  • LIGHT collections (students, results, finance, …) are stored
//    inline as a single Firestore document at
//      schools/{SCHOOL_ID}/collections/{key}   →  { value, updatedAt }
//    One document op per save/read — real-time via onSnapshot, well
//    within the Firebase Spark (free) plan.
//
//  • HEAVY collections (homework attachments, timetable images,
//    news/post images, certificate archives, …) embed large base64
//    payloads that can exceed Firestore's 1 MB per-document limit.
//    These are written to Firebase Storage as a JSON blob at
//      schools/{SCHOOL_ID}/blobs/{key}.json
//    with a tiny Firestore POINTER document at
//      schools/{SCHOOL_ID}/collections/{key}
//        → { blob: true, downloadURL, updatedAt, size }
//    The pointer is watched with onSnapshot for real-time change
//    notification; the actual payload is fetched from Storage. This
//    keeps base64 intact (required for in-browser jsPDF embedding)
//    while still syncing files across every device — all on the free
//    tier (5 GB Storage on Spark).
//
// Data is isolated per school via SCHOOL_ID. Every operation fails
// gracefully (offline / rules-blocked) so the app keeps working from
// its local IndexedDB + localStorage caches.
// ═══════════════════════════════════════════════════════════════════

// File-heavy collections routed through Firebase Storage (see above).
export const HEAVY_KEYS: string[] = [
  'providence_homeworks',
  'providence_posts',
  'providence_news',
  'providence_academic_assets',
  'providence_class_timetable_images',
  'providence_timetables',
  'providence_exam_planning',
];

// Lightweight collections that sync inline as Firestore documents.
const LIGHT_KEYS: string[] = [
  'providence_students',
  'providence_academic_results',
  'providence_employees',
  'providence_exams',
  'providence_announcements',
  'providence_messages',
  'providence_email_delivery_logs',
  'providence_school_branding',
  'providence_certificate_registry',
  'providence_weekly_schedule',
  'providence_weekly_schedule_locks',
  'providence_timetable_action_logs',
  'providence_statistics_filter_presets',
  'providence_eduserv_sync_logs',
  'providence_app_preferences',
  'providence_parent_users',
  'providence_finance',
  'providence_attendance',
];

// Every collection that participates in cloud sync.
export const CLOUD_KEYS: string[] = [...LIGHT_KEYS, ...HEAVY_KEYS];

export function isCloudKey(key: string): boolean {
  return CLOUD_KEYS.includes(key);
}

export function isHeavyKey(key: string): boolean {
  return HEAVY_KEYS.includes(key);
}

function pointerRef(key: string) {
  return doc(db, 'schools', SCHOOL_ID, 'collections', key);
}

function blobRef(key: string) {
  return ref(storage, `schools/${SCHOOL_ID}/blobs/${key}.json`);
}

// Maximum time (ms) to wait on any single cloud read before falling back
// to local data. Prevents the UI from hanging when the Firestore database
// is missing/unreachable (the SDK retries such calls indefinitely).
const CLOUD_READ_TIMEOUT_MS = 4000;

// Once a cloud read times out (e.g. the Firestore database is missing or
// the network is blocked) we stop attempting further blocking reads for
// the rest of this session, so the initial load stays fast and falls
// straight back to the local cache. Real-time onSnapshot subscriptions
// still run and will hydrate the UI automatically if the cloud recovers.
let cloudReadsDegraded = false;

/** Resolve `undefined` if the promise does not settle within `ms`. */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | undefined> {
  return new Promise<T | undefined>((resolve) => {
    const timer = setTimeout(() => { cloudReadsDegraded = true; resolve(undefined); }, ms);
    promise.then(
      (v) => { clearTimeout(timer); resolve(v); },
      () => { clearTimeout(timer); resolve(undefined); },
    );
  });
}

/** Fetch and parse a JSON blob from a Firebase Storage download URL. */
async function fetchBlob<T>(downloadURL: string): Promise<T | undefined> {
  try {
    const res = await fetch(downloadURL);
    if (!res.ok) return undefined;
    return (await res.json()) as T;
  } catch (e) {
    console.warn('[sync] fetchBlob failed', e);
    return undefined;
  }
}

/** Read a collection from Firestore (light) or Storage (heavy).
 *  Returns undefined when missing, offline, or blocked by rules
 *  (caller falls back to local data). */
export async function loadCloud<T>(key: string): Promise<T | undefined> {
  if (cloudReadsDegraded) return undefined;
  try {
    const snap = await withTimeout(getDoc(pointerRef(key)), CLOUD_READ_TIMEOUT_MS);
    if (!snap || !snap.exists()) return undefined;
    const data = snap.data();
    if (!data) return undefined;
    // Heavy collection: pointer references a Storage blob.
    if (data.blob && typeof data.downloadURL === 'string') {
      return await withTimeout(fetchBlob<T>(data.downloadURL), CLOUD_READ_TIMEOUT_MS);
    }
    // Light collection: value stored inline.
    if ('value' in data) return data.value as T;
  } catch (e) {
    console.warn(`[sync] loadCloud(${key}) failed — using local data`, e);
  }
  return undefined;
}

/** Write a collection to Firestore (light) or Storage + pointer (heavy). */
export async function saveCloud(key: string, value: unknown): Promise<void> {
  const updatedAt = new Date().toISOString();
  try {
    if (isHeavyKey(key)) {
      // 1) Serialize and upload the full payload to Storage (no 1 MB cap).
      const json = JSON.stringify(value ?? null);
      await uploadString(blobRef(key), json, 'raw', {
        contentType: 'application/json',
      });
      // 2) Resolve a stable download URL and write the tiny pointer doc.
      const downloadURL = await getDownloadURL(blobRef(key));
      await setDoc(
        pointerRef(key),
        { blob: true, downloadURL, updatedAt, size: json.length },
        { merge: true },
      );
    } else {
      await setDoc(
        pointerRef(key),
        { value, updatedAt },
        { merge: true },
      );
    }
  } catch (e) {
    console.warn(`[sync] saveCloud(${key}) failed — kept locally`, e);
  }
}

/** Subscribe to live changes of a collection. For heavy collections the
 *  pointer document is watched and the blob is fetched on each change.
 *  The callback fires whenever another device updates the data. */
export function subscribeCloud(key: string, cb: (value: unknown) => void): () => void {
  try {
    return onSnapshot(
      pointerRef(key),
      (snap) => {
        if (!snap.exists()) return;
        const data = snap.data();
        if (!data) return;
        if (data.blob && typeof data.downloadURL === 'string') {
          // Heavy: fetch the payload from Storage, then deliver it.
          void fetchBlob<unknown>(data.downloadURL).then((value) => {
            if (value !== undefined) cb(value);
          });
        } else if ('value' in data) {
          cb(data.value);
        }
      },
      (err) => console.warn(`[sync] subscribeCloud(${key}) error`, err),
    );
  } catch (e) {
    console.warn(`[sync] subscribeCloud(${key}) setup failed`, e);
    return () => {};
  }
}
