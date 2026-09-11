/* Service Worker لتطبيق العناية (Kaled-Kled) — تثبيت مجاني على الهاتف.
 * البيانات على الجهاز (LocalStorage/IndexedDB) فالتخزين المؤقت للهيكل آمن.
 * طلبات الشبكة (Firebase/البريد) تمر مباشرة دون تخزين. لا اعتراض لغير GET.
 */
const VERSION = 'kled-pwa-v2';
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

  // الـ API أبداً لا يُخزَّن: بيانات مالية وجلسات — تخزينها يعني أرقاماً قديمة
  // وتسرب بيانات بين مستخدمي الجهاز نفسه. الشبكة فقط دائماً.
  if (url.pathname.indexOf('/api/') === 0) return;

  const offlinePage = () => new Response(
    '<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8">'
    + '<meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<title>العناية</title></head><body style="font-family:sans-serif;text-align:center;padding:40px">'
    + '<h1>لا يوجد اتصال</h1><p>تحقق من الإنترنت ثم أعد المحاولة.</p></body></html>',
    { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  );

  // التنقل: الشبكة أولاً ثم الهيكل المخزن ثم صفحة عدم الاتصال (رد مضمون دائماً).
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(PAGES_CACHE).then((cache) => cache.put('/', copy));
          return res;
        })
        .catch(() => caches.match('/').then((hit) => hit || offlinePage())),
    );
    return;
  }

  // الملفات الثابتة: stale-while-revalidate مع ضمان الرد.
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
          .catch(() => hit || Response.error());
        return hit || network.then((res) => res || Response.error());
      }),
    );
  }
});
