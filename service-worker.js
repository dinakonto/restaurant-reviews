/* TOOK INSPO FROM:
 * https://css-tricks.com/serviceworker-for-offline/
 * https://developer.mozilla.org/en-US/docs/Web/API/Cache/match
 * https://googlechrome.github.io/samples/service-worker/custom-offline-page/index.html
 */

const offlinePage = 'offline.html';
const toBeCached = [
  '/',
  '/css/styles.css',
  '/js/main.js',
  '/js/dbhelper.js',
  '/js/restaurant_info.js',
  '/data/restaurants.json',
  'index.html',
  'offline.html'
];

// IMPORTANT: Update version when updating the SW.
// The 'activate' event will then remove older SWs.
const currentVersion = 'v1::';


/* 'INSTALL' EVENT LISTENER
 * When main.js fires the event to install the SW,
 * block install completion until the following are succesfully completed.
 */
self.addEventListener('install', event => {
  // .waitUntil() is what actually blocks completion
  event.waitUntil(
    caches
      // Open a cache
      .open(currentVersion + 'initial-cache')
      // All files needed for a basic offline view saved to the cache
      .then(cache => {
        return cache.addAll(toBeCached);
      })
  );
});

/* 'ACTIVATE' EVENT LISTENER
 * When the install is complete, the 'activate' event fires.
 * Use this to phase out any older SWs.
 */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      // Get an array of available cache keys (event requests)
      .keys()
      .then(keys => {
        // Promise fulfills when we've deleted everything from old versions
        return Promise.all(
          keys
          // Filter by keys aren't from our current version
            .filter(key => {
              return !key.startsWith(currentVersion);
            })
            // Delete each of them
            .map(key => {
              return caches.delete(key);
            })
        );
      })
  );
});


/* 'FETCH' EVENT LISTENER
 * Each time the page requests a resource, a 'fetch' event fires.
 * We intercept these to serve from the cache first.
 */
self.addEventListener('fetch', event => {
  // We only want to intercept and cache GET requests
  if (event.request.method !== 'GET') {
    // So don't intercept other requests; let 'em go!
    return;
  }
  // If it IS a GET request...
  event.respondWith(
    caches
      // First, try to find a cache entry matching the request
      .match(event.request)

      // Try to fetch the request from the network as well
      .then(cached => {
        const networked = fetch(event.request)
        // Handle the fetch request success and failure
          .then(fetchedFromNetwork, unableToResolve)
          .catch(unableToResolve);

        // Return the cached response straight away if there is one
        // and fall back to waiting on the network as normal
        return cached || networked;

        /********** FUNCTIONS USED ABOVE **********/
        // Save responses from the network to the cache
        function fetchedFromNetwork(response) {
          const cacheCopy = response.clone();

          caches
            // Open a separate cache to store the network response
            .open(currentVersion + 'pages')
            // Store the response. This is accessed by caches.match(event.request)
            .then(function add(cache) {
              cache.put(event.request, cacheCopy);
            });

          // Return the response from the network, settles the promise
          return response;
        }

        // Serve a custom offline response
        function unableToResolve() {
          let response = caches.match(offlinePage);
          return response;
        }
      })
  );
});
