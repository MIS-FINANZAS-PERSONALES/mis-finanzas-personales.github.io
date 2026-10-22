const CACHE_NAME = 'finanzas-v4';
const ASSETS = [
  './',
  'index.html',
  'manifest.json',
  'assets/css/styles.css',
  'assets/js/app.js',
  'assets/js/db.js',
  'assets/js/auth.js',
  'assets/js/finance.js',
  'assets/js/analysis.js',
  'assets/js/charts.js',
  'assets/js/ui.js',
  'assets/js/backup.js',
  'ayuda.html',
  'assets/icons/icon-192.png',
  'assets/icons/icon-512.png',
  'assets/icons/icon-maskable-512.png',
  'assets/icons/apple-touch-icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(names =>
      Promise.all(names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n)))
    ).then(() => self.clients.claim())
  );
});

// Red primero (para recibir actualizaciones) y caché si no hay conexión.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    // no-cache: revalida con el servidor en vez de usar la caché HTTP del navegador
    fetch(e.request, { cache: 'no-cache' })
      .then(res => {
        if (res.ok && new URL(e.request.url).origin === self.location.origin) {
          const copia = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, copia));
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
