// const CACHE_NAME = "foxapp-cache-v1";
// const ASSETS_TO_CACHE = [
//   "/",
//   "/index.html",
//   "/style.css",
//   "/src/main.js",
//   "/src/classes/Target.js",
//   "/src/procedures/helpers.js",
//   "/src/procedures/draw.js"
// ];

// // Install: cache essential assets
// self.addEventListener("install", (event) => {
//   event.waitUntil(
//     caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
//   );
// });

// // Activate: clean up old caches if needed
// self.addEventListener("activate", (event) => {
//   event.waitUntil(
//     caches.keys().then((keys) =>
//       Promise.all(
//         keys
//           .filter((key) => key !== CACHE_NAME)
//           .map((key) => caches.delete(key))
//       )
//     )
//   );
// });

// // Fetch: network first, fallback to cache
// self.addEventListener("fetch", (event) => {
//   event.respondWith(
//     fetch(event.request)
//       .then((response) => {
//         // Optionally update cache with the fresh response
//         const responseClone = response.clone();
//         caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
//         return response;
//       })
//       .catch(() => caches.match(event.request)) // offline fallback
//   );
// });
