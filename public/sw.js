// Self-destroying service worker.
//
// LootFlow used to ship as a PWA. Returning visitors still have that old
// service worker registered, and it keeps serving a stale, cached build —
// plain reloads never reach the network. This replacement wipes every cache,
// unregisters itself, and reloads open tabs so they come back fresh.
//
// Nothing in the current app registers a service worker, so once a browser
// has run this cleanup there is no registration left to update — no loop.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const names = await caches.keys();
        await Promise.all(names.map((name) => caches.delete(name)));
      } catch (e) { /* ignore */ }

      try {
        await self.clients.claim();
        const clients = await self.clients.matchAll({ type: 'window' });
        for (const client of clients) {
          client.navigate(client.url);
        }
      } catch (e) { /* ignore */ }

      try {
        await self.registration.unregister();
      } catch (e) { /* ignore */ }
    })(),
  );
});
