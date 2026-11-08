/* Glazecalc: Background Sync for the changes waiting on this device (client/app/core/outbox.ts). Added to the end of
   ngsw-worker.js by scripts/service-worker.mjs (not to the kill-switch worker). Where the browser has SyncManager
   (Chromium), it fires `sync` once the network is back; the worker tells every open page, which sends the changes
   itself, with its own conflict rules. With no page open, nothing is sent until the site is next opened. */
self.addEventListener('sync', (event) => {
  if (event.tag !== 'gc-outbox') return;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      for (const client of windows) client.postMessage({ type: 'gc-outbox-sync' });
    })
  );
});
