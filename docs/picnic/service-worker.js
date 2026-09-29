/**
 * @file Caches Picnic assets for offline use with network-first fetch handling.
 * @author Codex
 */

const CACHE_NAME = 'picnic-qr-v4';
const APP_FILES = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './totes.js',
  './dockLocations.js',
  './scanner.js',
  './qr.js',
  './vendor/zxing-browser.min.js',
  './manifest.webmanifest',
  './assets/picnic-icon-180.png',
  './assets/picnic-icon-192.png',
  './assets/picnic-icon-512.png',
];

/** Precache the full app before activating the new worker. */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_FILES))
      .then(() => self.skipWaiting())
  );
});

/** Delete older Picnic caches, preserve other apps' caches and claim clients. */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key.startsWith('picnic-qr-') && key !== CACHE_NAME)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

/** Serve same-origin GET requests from the network, falling back to cached assets or the app shell. */
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(
    fetch(event.request).then(response => {
      if (response.ok) caches.open(CACHE_NAME).then(cache => cache.put(event.request, response.clone()));
      return response;
    }).catch(() => caches.match(event.request).then(cached => cached || (event.request.mode === 'navigate' ? caches.match('./index.html') : Response.error())))
  );
});
