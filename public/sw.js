/* Service Worker لتطبيق العناية (Kaled-Kled) — تثبيت مجاني على الهاتف.
 * البيانات على الجهاز (LocalStorage/IndexedDB) فالتخزين المؤقت للهيكل آمن.
 * طلبات الشبكة (Firebase/البريد) تمر مباشرة دون تخزين. لا اعتراض لغير GET.
 */
const VERSION = 'kled-pwa-v1';
const STATIC_CACHE = VERSION + '-static';
const PAGES_CACHE = VERSION + '-pages';

const PRECACHE = [
  '/',
  '/manifest.json',
  '/favicon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(PAGES_CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k.indexOf(VERSION) !== 0).map((k) => caches.delete(k))),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Firebase وخدمات البريد: الشبكة فقط.
  if (
    url.hostname.indexOf('firebase') !== -1 ||
    url.hostname.indexOf('googleapis.com') !== -1 ||
    url.hostname.indexOf('emailjs') !== -1
  ) return;

  // التنقل: الشبكة أولاً ثم الهيكل المخزن (يعمل دون اتصال).
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(PAGES_CACHE).then((cache) => cache.put('/', copy));
          return res;
        })
        .catch(() => caches.match('/')),
    );
    return;
  }

  // الملفات الثابتة: stale-while-revalidate.
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then((hit) => {
        const network = fetch(req)
          .then((res) => {
            if (res && res.status === 200) {
              const copy = res.clone();
              caches.open(STATIC_CACHE).then((cache) => cache.put(req, copy));
            }
            return res;
          })
          .catch(() => hit);
        return hit || network;
      }),
    );
  }
});
