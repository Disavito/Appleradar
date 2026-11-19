// Service Worker para MacRadar (PWA & Notificaciones Push)
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Manejo de clicks en la notificación
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Si la pestaña ya está abierta, enfocarla
      for (const client of clientList) {
        if ('focus' in client) {
          if (client.url === targetUrl || targetUrl === '/') {
            return client.focus();
          }
        }
      }
      // Si no está abierta o es un enlace externo, abrir ventana nueva
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
