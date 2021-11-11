importScripts('https://storage.googleapis.com/workbox-cdn/releases/5.1.2/workbox-sw.js');

workbox.setConfig({
  debug: true,
});

workbox.routing.registerRoute(new RegExp('.+\\.(ico|json|png)$'), new workbox.strategies.StaleWhileRevalidate());
workbox.routing.registerRoute(new RegExp('/nitrox/?$'), new workbox.strategies.StaleWhileRevalidate());
workbox.core.skipWaiting();
workbox.core.clientsClaim();

