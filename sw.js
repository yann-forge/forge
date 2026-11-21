/* Service worker Forge : réseau d'abord (mises à jour automatiques), cache en secours (hors ligne). */
const CACHE = 'forge3-3.1.1'; /* = APP_VERSION de app.js */
const ASSETS = ['./', 'index.html', 'style.css', 'engine.js', 'app.js', 'report.js', 'manifest.webmanifest',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png',
  'vendor/jspdf.umd.min.js', 'vendor/pdf-fonts.js'];
const TIMEOUT = 4000; /* au-delà, on sert le cache : évite l'attente quand le réseau est présent mais ne répond pas */
const abs = a => new URL(a, self.registration.scope).href;

/* Chaque fichier est mis en cache séparément : un fichier absent ne bloque plus toute l'installation */
async function fillCache() {
  const c = await caches.open(CACHE);
  const res = await Promise.allSettled(ASSETS.map(async a => {
    const r = await fetch(abs(a), { cache: 'reload' });
    if (!r.ok) throw new Error(a + ' ' + r.status);
    await c.put(abs(a), r);
  }));
  return res.map((r, i) => r.status === 'rejected' ? ASSETS[i] : null).filter(Boolean);
}
async function status() {
  const c = await caches.open(CACHE), missing = [];
  for (const a of ASSETS) if (!(await c.match(abs(a)))) missing.push(a);
  return { cache: CACHE, total: ASSETS.length, missing };
}

self.addEventListener('install', e => { e.waitUntil(fillCache()); self.skipWaiting(); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('forge3-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('message', e => {
  if (!e.data || !e.data.forge) return;
  const p = e.data.forge === 'repair' ? fillCache().then(status) : status();
  e.waitUntil(p.then(s => e.source && e.source.postMessage({ forgeStatus: s })));
});

function fromNetwork(req) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('délai')), TIMEOUT);
    fetch(req, { cache: 'no-cache' }).then(r => { clearTimeout(t); resolve(r); }, err => { clearTimeout(t); reject(err); });
  });
}
async function fromCache(req, nav) {
  const c = await caches.open(CACHE);
  let r = await c.match(req, { ignoreSearch: true });
  if (!r && nav) r = (await c.match(abs('./'))) || (await c.match(abs('index.html')));
  if (!r) r = await caches.match(req, { ignoreSearch: true }); /* ancien cache éventuel */
  return r || new Response('Forge : fichier indisponible hors ligne', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}

self.addEventListener('fetch', e => {
  const req = e.request, u = new URL(req.url);
  if (req.method !== 'GET' || u.origin !== location.origin || !u.pathname.startsWith(new URL(self.registration.scope).pathname)) return;
  const nav = req.mode === 'navigate';
  e.respondWith(fromNetwork(nav ? req.url : req).then(r => {
    if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(nav ? abs(u.pathname.endsWith('/') ? './' : u.pathname.split('/').pop()) : req, copy)); }
    return r.ok ? r : fromCache(req, nav).then(c => (c.status === 503 ? r : c));
  }, () => fromCache(req, nav)));
});
