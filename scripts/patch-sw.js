const fs = require('fs');
const path = require('path');

const swPath = path.join(__dirname, '..', 'public', 'sw.js');

const pushHandlers = `

// Push notification handlers — injected by scripts/patch-sw.js
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
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(list) {
      for (var i = 0; i < list.length; i++) {
        if (list[i].url.indexOf(url) !== -1 && 'focus' in list[i]) return list[i].focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
`;

if (!fs.existsSync(swPath)) {
  console.log('⚠  sw.js not found — skipping push handler patch');
  process.exit(0);
}

const existing = fs.readFileSync(swPath, 'utf8');
if (existing.includes('patch-sw.js')) {
  console.log('✓  SW already patched with push handlers');
  process.exit(0);
}

fs.writeFileSync(swPath, existing + pushHandlers, 'utf8');
console.log('✓  Push handlers injected into sw.js');
