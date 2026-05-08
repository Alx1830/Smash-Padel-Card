// Push notification handlers — importado por el service worker via usePushPermission
self.addEventListener('push', function (event) {
  if (!event.data) return;
  try {
    const data = event.data.json();
    event.waitUntil(
      self.registration.showNotification(data.title || 'FaceBinder', {
        body: data.body || '',
        icon: data.icon || '/icon-512.webp',
        badge: data.badge || '/favicon-32.png',
        data: data.data || {},
        vibrate: [200, 100, 200],
      })
    );
  } catch (e) {
    // payload no era JSON válido
  }
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/dashboard';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if (client.url.indexOf(url) !== -1 && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
