// Service worker aplikacji „Znajdź salę”: działanie offline (cache-first dla plików aplikacji).
const CACHE = 'znajdz-sale-v2';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Czcionki Google: zapisz w pamięci przy pierwszym pobraniu, potem serwuj z cache
  if (url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com') {
    event.respondWith(
      caches.open(CACHE).then(cache =>
        cache.match(req).then(hit => hit || fetch(req).then(res => { cache.put(req, res.clone()); return res; }))
      )
    );
    return;
  }

  // Pliki aplikacji: najpierw cache, w tle odświeżenie
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req, { ignoreSearch: true }).then(hit => {
        const net = fetch(req).then(res => {
          if (res.ok) caches.open(CACHE).then(cache => cache.put(req, res.clone()));
          return res;
        }).catch(() => hit || caches.match('./index.html'));
        return hit || net;
      })
    );
  }
});
