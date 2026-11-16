// Service worker do Lobby: mostra os avisos como notificação e abre a obra ao tocar.
self.addEventListener('push', (event) => {
  let data = { title: 'Lobby', body: '', url: '/' };
  try { data = { ...data, ...event.data.json() }; } catch { /* aviso sem conteúdo */ }
  event.waitUntil(self.registration.showNotification(data.title, {
    body: data.body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: { url: data.url },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || '/', self.location.origin).href;
  event.waitUntil((async () => {
    const tabs = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const open = tabs.find((t) => t.url === url);
    if (open) return open.focus();
    return self.clients.openWindow(url);
  })());
});
