// ═══════════════════════════════════════════
// AmwayPro — Service Worker v1
// Estrategia: Cache-First para el shell de la app.
// Los DATOS (IndexedDB / localStorage) NUNCA son
// tocados por el SW; solo se cachea el HTML/assets.
// ═══════════════════════════════════════════
const CACHE = 'amwaypro-shell-v1';

// Archivos que forman el "shell" de la app
const SHELL = [
  './',
  './AmwayPro_v8.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
];

// ── Instalación: guarda el shell en cache ──
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => {
      // addAll falla si algún recurso no existe;
      // usamos add individual para que los íconos
      // opcionales no rompan la instalación.
      return Promise.allSettled(
        SHELL.map(url => cache.add(url).catch(() => {}))
      );
    }).then(() => self.skipWaiting())
  );
});

// ── Activación: limpia caches viejos ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: Cache-First con fallback a red ──
self.addEventListener('fetch', event => {
  // Solo interceptamos GET; peticiones POST/etc. van directo a red
  if (event.request.method !== 'GET') return;

  // Ignorar peticiones a otros dominios (CDNs, APIs externas)
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;          // ← sirve desde cache (offline ✅)
      return fetch(event.request).then(response => {
        // Guarda en cache dinámicamente si es exitoso
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // Si falla la red Y no hay cache, devuelve el HTML principal
        return caches.match('./AmwayPro_v8.html');
      });
    })
  );
});
