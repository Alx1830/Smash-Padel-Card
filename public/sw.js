// FaceBinder Service Worker — push notifications + basic caching

const CACHE = 'fb-v3';
const PRECACHE = ['/', '/dashboard', '/market'];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE).then(function(cache) {
      return cache.addAll(PRECACHE).catch(function() {});
    }).then(function() { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE; }).map(function(k) { return caches.delete(k); })
      );
    }).then(function() { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(event) {
  if (event.request.method !== 'GET') return;
  // Las navegaciones van directo a la red: interceptarlas obliga a esperar a que
  // arranque el service worker, y en iOS eso alarga la pantalla de inicio sin dar
  // nada a cambio (esta caché solo servía de respaldo sin conexión).
  if (event.request.mode === 'navigate') return;
  const url = new URL(event.request.url);
  // No interceptar API calls ni Supabase
  if (url.pathname.startsWith('/api/') || url.hostname.includes('supabase')) return;

  event.respondWith(
    fetch(event.request).catch(function() {
      return caches.match(event.request);
    })
  );
});

// ── Push notifications ──────────────────────────────────────────

self.addEventListener('push', function(event) {
  if (!event.data) return;
  try {
    var data = event.data.json();
    event.waitUntil(
      self.registration.showNotification(data.title || 'FaceBinder', {
        body: data.body || '',
        icon: data.icon || '/icon-512.webp',
        badge: data.badge || '/favicon-32.png',
        data: data.data || {},
        vibrate: [200, 100, 200],
      })
    );
  } catch(e) {}
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  var url = (event.notification.data && event.notification.data.url) || '/dashboard';

  // Tocar la notificacion tiene que abrir la noticia, no la ultima pantalla
  // que quedo abierta. Antes, con la app ya abierta en el celular, se enfocaba
  // esa ventana y ahi terminaba: el usuario veia el panel y nunca la nota. Por
  // eso ahora, si la ventana existe pero esta en otra direccion, se la navega.
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(list) {
      for (var i = 0; i < list.length; i++) {
        var c = list[i];
        if (c.url.indexOf(url) !== -1) return 'focus' in c ? c.focus() : undefined;
      }
      for (var j = 0; j < list.length; j++) {
        var w = list[j];
        if ('navigate' in w) {
          return w.focus().then(function(f) {
            return (f || w).navigate(url);
          }).catch(function() {
            return clients.openWindow ? clients.openWindow(url) : undefined;
          });
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
