// service-worker.js

// Define a cache name
const CACHE_NAME = 'wcm-cache-v1';
// List of files to cache
const urlsToCache = [
  '/',
  '/index.html',
  '/prayerTimetable.html',
  '/donations.html',
  '/login.html',
  '/assets/css/styles.min.css',
  '/assets/js/script.min.js',
  '/assets/js/js/auth.mjs',
  '/assets/js/js/indexScript.mjs',
  '/assets/js/js/prayerTimetable.mjs',
  '/assets/img/img/logo-mosque.svg',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.6/dist/css/bootstrap.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.6/dist/js/bootstrap.bundle.min.js',
  'https://ajax.googleapis.com/ajax/libs/jquery/3.6.1/jquery.min.js',
  'https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js',
  'https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js',
  'https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js'
];

// Install event: cache files
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event: serve cached files when offline
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});

// Push event: handle push notifications
self.addEventListener('push', event => {
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/assets/img/fav192.png',
    badge: '/assets/img/fav192.png'
  };
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click event
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/')
  );
});
