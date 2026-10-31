/* sw.js - Abre al instante con lo guardado y se actualiza en segundo plano. Cambie VERSION al subir archivos nuevos. */
var VERSION = 'auditoria-B2.0';
var ARCHIVOS = ['./', 'index.html', 'estilos.css', 'datos.js', 'calc.js', 'diario.js', 'xlsx.js', 'docs.js', 'vistas2.js', 'app.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) { return Promise.all(ARCHIVOS.map(function (a) { return c.add(a).catch(function () { /* un archivo ausente no debe impedir la instalación */ }); })); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.open(VERSION).then(function (c) {
    return c.match(e.request, { ignoreSearch: true }).then(function (hit) {
      var red = fetch(e.request).then(function (r) { if (r && r.ok) c.put(e.request, r.clone()); return r; }).catch(function () { return hit || c.match('index.html'); });
      return hit || red;
    });
  }));
});
/* FIN DEL ARCHIVO sw.js */
