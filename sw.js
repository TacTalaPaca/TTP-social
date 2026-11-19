// Koinara service worker. Cache the whole demo for offline use.
const CACHE = 'koinara-1.7';

const CORE = [
  './',
  './index.html',
  './app.css',
  './app.js',
  './seed.js',
  './icons.js',
  './manifest.json',
  './assets/fonts/atkinson-hyperlegible-next.woff2',
  './assets/fonts/OFL.txt',
  './assets/icons/LICENSE',
  './assets/icons/icon.svg',
  './assets/icons/favicon.svg',
  './assets/icons/favicon-32.png',
  './assets/icons/favicon-16.png',
  './assets/icons/icon-96.png',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-1024.png',
  './assets/icons/maskable-512.png',
  './assets/icons/monochrome-512.png',
  './assets/icons/apple-touch-icon.png',
  './assets/icons/mark.svg',
  './assets/img/p01-400.avif',
  './assets/img/p01-800.avif',
  './assets/img/p02-400.avif',
  './assets/img/p02-800.avif',
  './assets/img/p03-400.avif',
  './assets/img/p03-800.avif',
  './assets/img/p04-400.avif',
  './assets/img/p04-800.avif',
  './assets/img/p05-400.avif',
  './assets/img/p05-800.avif',
  './assets/img/p06-400.avif',
  './assets/img/p06-800.avif',
  './assets/img/p07-400.avif',
  './assets/img/p07-800.avif',
  './assets/img/p08-400.avif',
  './assets/img/p08-800.avif',
  './assets/img/p09-400.avif',
  './assets/img/p09-800.avif',
  './assets/img/p10-400.avif',
  './assets/img/p10-800.avif',
  './assets/img/p11-400.avif',
  './assets/img/p11-800.avif',
  './assets/img/p12-400.avif',
  './assets/img/p12-800.avif',
  './assets/img/p13-400.avif',
  './assets/img/p13-800.avif',
  './assets/img/p14-400.avif',
  './assets/img/p14-800.avif',
  './assets/img/p15-400.avif',
  './assets/img/p15-800.avif',
  './assets/img/p16-400.avif',
  './assets/img/p16-800.avif',
  './assets/img/p17-400.avif',
  './assets/img/p17-800.avif',
  './assets/img/p18-400.avif',
  './assets/img/p18-800.avif',
  './assets/img/av-ana.avif',
  './assets/img/av-eli.avif',
  './assets/img/av-iris.avif',
  './assets/img/av-jules.avif',
  './assets/img/av-kenji.avif',
  './assets/img/av-lena.avif',
  './assets/img/av-mae.avif',
  './assets/img/av-mira.avif',
  './assets/img/av-noor.avif',
  './assets/img/av-theo.avif',
  './assets/img/av-tomas.avif'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const cachePut = (res) => {
    if (!res || !res.ok) return;
    const copy = res.clone();
    caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
  };

  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          cachePut(res);
          return res;
        })
        .catch(() => caches.match('./index.html').then((r) => r || caches.match('./')))
    );
    return;
  }

  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  // App code and styles: always try the network first, so a deploy is picked
  // up on the next load. Images and fonts: cache first, refresh in the
  // background for the load after.
  const shell = /\.(?:html|js|css|json)$/.test(url.pathname) || url.pathname.endsWith('/');

  if (shell) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          cachePut(res);
          return res;
        })
        .catch(() => caches.match(req).then((hit) => hit || Response.error()))
    );
    return;
  }

  e.respondWith(
    caches.match(req).then((hit) => {
      const network = fetch(req).then((res) => {
        cachePut(res);
        return res;
      }).catch(() => hit || Response.error());
      return hit || network;
    })
  );
});
