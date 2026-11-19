// Utilidad para solicitar permisos y disparar Notificaciones Push locales / nativas
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service Worker no soportado en este navegador');
    return null;
  }

  try {
    const reg = await navigator.serviceWorker.register('/sw.js');
    console.log('✅ Service Worker de MacRadar registrado con éxito');
    return reg;
  } catch (err) {
    console.error('Error al registrar Service Worker:', err);
    return null;
  }
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    alert('Tu navegador no soporta notificaciones de escritorio/móvil.');
    return 'denied';
  }

  const permission = await Notification.requestPermission();
  return permission;
}

export function showPushNotification(title: string, options: NotificationOptions) {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }

  // Si hay service worker activo, usar showNotification (funciona en móvil/Android)
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.ready.then((registration) => {
      const swOptions: any = {
        icon: '/icon.svg',
        badge: '/icon.svg',
        vibrate: [200, 100, 200],
        ...options
      };
      registration.showNotification(title, swOptions);
    });
  } else {
    // Fallback nativo de escritorio
    new Notification(title, {
      icon: '/icon.svg',
      ...options
    });
  }
}
