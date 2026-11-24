/* MHWilds Database : cache hors ligne.
   Ouvre toujours la version en cache (rapide, marche sans réseau) et la met à jour en arrière-plan :
   après une mise à jour du site, la nouvelle version s'affiche au lancement suivant. */
const APP = 'mhwilds-app-v1';
const FONTS = 'mhwilds-fonts-v1';
const CORE = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png',
              './maskable-192.png', './maskable-512.png', './apple-touch-icon.png', './favicon-48.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(APP).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('mhwilds-') && k !== APP && k !== FONTS).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.origin === location.origin) {
    e.respondWith((async () => {
      const cache = await caches.open(APP);
      const cached = (await cache.match(req, { ignoreSearch: true })) ||
                     (req.mode === 'navigate' ? await cache.match('./index.html') : undefined);
      const fresh = fetch(req).then(r => { if (r && r.ok) cache.put(req, r.clone()); return r; }).catch(() => undefined);
      if (cached) { e.waitUntil(fresh); return cached; }
      return (await fresh) || Response.error();
    })());
    return;
  }

  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith((async () => {
      const cache = await caches.open(FONTS);
      const hit = await cache.match(req);
      if (hit) return hit;
      try {
        const r = await fetch(req);
        if (r && (r.ok || r.type === 'opaque')) cache.put(req, r.clone());
        return r;
      } catch (err) { return Response.error(); }
    })());
  }
});
