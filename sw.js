/* sw.js - Red primero (máx. 3 s) y, si no hay internet, lo guardado. Sube VERSION al publicar cambios. */
var VERSION = 'auditoria-B2.2';
var ARCHIVOS = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) {
    return Promise.all(ARCHIVOS.map(function (a) { return fetch(a, { cache: 'no-cache' }).then(function (r) { if (r.ok) return c.put(a, r); }).catch(function () { /* sin red */ }); }));
  }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.open(VERSION).then(function (c) {
    var red = new Promise(function (ok, no) {
      var t = setTimeout(function () { no(new Error('lento')); }, 3000);
      fetch(e.request, { cache: 'no-cache' }).then(function (r) { clearTimeout(t); if (r && r.ok) c.put(e.request, r.clone()); ok(r); }, function (er) { clearTimeout(t); no(er); });
    });
    return red.catch(function () { return c.match(e.request, { ignoreSearch: true }).then(function (h) { return h || c.match('index.html'); }); });
  }));
});
/* FIN DEL ARCHIVO sw.js */
