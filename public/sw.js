// =========================================================================
// KurdFit Service Worker - Offline Caching for Exercises & App Shell
// =========================================================================
const CACHE_VERSION = 'kurdfit-v1';
const MEDIA_CACHE_NAME = 'gym-exercise-media-v1';
const STATIC_CACHE_NAME = 'gym-static-assets-v1';

const STATIC_PRECACHE_URLS = [
  '/',
  '/manifest.json',
  '/exercises-index.json',
  '/icon-192x192.png',
  '/icon-512x512.png'
];

// ١. لە کاتی Install بوون: خێرا باڕکردن و precache کردنی فایلە سەرەکییەکان
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_PRECACHE_URLS).catch((err) => {
        console.warn('Precache partial warning:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// ٢. لە کاتی Activate بوون: پاککردنەوەی کاشە کۆنەکان
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== STATIC_CACHE_NAME && name !== MEDIA_CACHE_NAME) {
            // کاشی زۆر کۆن بسڕەوە
            if (name.startsWith('kurdfit-') || name.startsWith('workbox-')) {
              return caches.delete(name);
            }
          }
          return null;
        })
      );
    }).then(() => self.clients.claim())
  );
});

// ٣. شێوازی فێچ (Fetch Event): ستراتیژی تایبەت بۆ وێنەی جووڵاوی ڕاهێنانەکان و فایلەکان
self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // الف. وێنەکانی ڕاهێنان (Exercise GIF animations لە raw.githubusercontent.com)
  // ستراتیژ: Cache-First لەگەڵ خۆکارانە پاشەکەوتکردن بۆ دۆخی ئۆفلاین
  if (url.hostname === 'raw.githubusercontent.com' && url.pathname.includes('exercises-dataset')) {
    event.respondWith(
      caches.open(MEDIA_CACHE_NAME).then(async (cache) => {
        const cachedResponse = await cache.match(request);
        if (cachedResponse) {
          return cachedResponse;
        }

        try {
          const networkResponse = await fetch(request);
          if (networkResponse && networkResponse.status === 200) {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        } catch (networkError) {
          // ئەگەر ئۆفلاین بوو و لە کاشیش نەبوو
          return new Response(null, { status: 503, statusText: 'Offline - Image Not Cached' });
        }
      })
    );
    return;
  }

  // ب. فایلی ئیندێکسی ڕاهێنانەکان (/exercises-index.json)
  // ستراتیژ: Stale-While-Revalidate (نیشاندانی خێرا لە کاش و نوێکردنەوە لە پاشبنەما)
  if (url.pathname === '/exercises-index.json') {
    event.respondWith(
      caches.open(STATIC_CACHE_NAME).then(async (cache) => {
        const cachedResponse = await cache.match(request);
        const fetchPromise = fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(() => null);

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // ج. وێنە لۆکاڵییەکان، ئایکۆن و مۆدێلەکان (/images, /icons, /models)
  if (url.pathname.match(/\.(png|jpg|jpeg|svg|webp|gif|ico|glb|gltf|bin)$/i)) {
    event.respondWith(
      caches.open(STATIC_CACHE_NAME).then(async (cache) => {
        const cachedResponse = await cache.match(request);
        if (cachedResponse) return cachedResponse;

        try {
          const networkResponse = await fetch(request);
          if (networkResponse && networkResponse.status === 200) {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        } catch (err) {
          return cachedResponse;
        }
      })
    );
    return;
  }

  // د. پەڕەکانی ئەپ (HTML و فایلەکانی تر) - ستراتیژی Network-First
  // بۆ ئەوەی هەمیشە نوێترین داتای بەرنامە وەربگیرێت بەڵام کاتی نەبوونی ئینتەرنێت لە کاش بێت
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(STATIC_CACHE_NAME);
        const cachedHome = await cache.match('/');
        return cachedHome || new Response('Offline - No connection', {
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      })
    );
  }
});
