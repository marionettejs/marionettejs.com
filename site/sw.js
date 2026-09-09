// Retire the old site's root-scoped sw-precache worker for returning visitors.
// Keep this URL while browsers can retain registrations from the v0-v4 website.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith('sw-precache-v3-marionettejs.com-')).map(name => caches.delete(name)));
    await self.clients.claim();
    await self.registration.unregister();
    const windows = await self.clients.matchAll({ type: 'window' });
    await Promise.allSettled(windows.map(client => client.navigate(client.url)));
  })());
});
