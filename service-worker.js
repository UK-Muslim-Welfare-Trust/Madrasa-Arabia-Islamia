// IMPORTANT: This file must be placed in the ROOT directory of your website,
// in the same folder as your index.html file.

import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js';
import { getMessaging, onBackgroundMessage } from 'https://www.gstatic.com/firebasejs/12.3.0/firebase-messaging-sw.js';

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDuq7jYQcKDKY3UWNxQwP51fKRwjCERuvo",
    authDomain: "wakefield-central-mosque.firebaseapp.com",
    projectId: "wakefield-central-mosque",
    storageBucket: "wakefield-central-mosque.appspot.com",
    messagingSenderId: "998395111777",
    appId: "1:998395111777:web:5492302e7279822d5cbd20",
    measurementId: "G-NXER4ENDE0"
};

// Initialize the Firebase app in the service worker
const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

// Handle background messages
onBackgroundMessage(messaging, (payload) => {
    console.log('[service-worker.js] Received background message ', payload);

    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: '/assets/img/fav192.png'
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});


// --- Standard Service Worker Lifecycle ---

const CACHE_NAME = 'wcm-cache-v4'; // Incremented cache version
const urlsToCache = [
  // HTML Pages
  '/',
  '/index.html',
  '/prayerTimetable.html',
  '/donations.html',
  '/login.html',
  '/admin/admin.html',
  '/manifest.json',

  // CSS
  '/assets/css/styles.min.css',

  // Core JS - non-modules
  '/assets/js/script.min.js',
  '/assets/js/js/donation.min.js',
  
  // Module entry points
  '/assets/js/js/app.mjs',
  '/assets/js/js/firebase-init.mjs',
  '/assets/js/js/auth.mjs',
  '/assets/js/js/indexScript.mjs',
  '/assets/js/js/prayerTimetable.mjs',
  '/assets/js/js/login.mjs',
  '/assets/js/js/adminScript.mjs',

  // Key Images
  '/assets/img/img/logo-mosque.svg',
  '/assets/img/fav192.png',
  '/assets/img/fav512.png',
  '/assets/img/img/hero-bg.jpg',

  // External Libraries
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.6/dist/css/bootstrap.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.6/dist/js/bootstrap.bundle.min.js',
  'https://ajax.googleapis.com/ajax/libs/jquery/3.6.1/jquery.min.js',
  'https://fonts.googleapis.com/css2?family=Dancing+Script&family=Playfair+Display:wght@500&family=Work+Sans&display=swap',
  'https://use.fontawesome.com/releases/v5.12.0/css/all.css',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.10.0/css/all.min.css'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache and caching assets');
        return cache.addAll(urlsToCache).catch(err => {
            console.error("Failed to cache some assets:", err);
        });
      })
  );
});


self.addEventListener('fetch', event => {
    // For Firebase and external API calls, always go to the network.
    if (event.request.url.includes('firebase') || event.request.url.includes('aladhan.com')) {
        event.respondWith(fetch(event.request));
        return;
    }

    event.respondWith(
        caches.match(event.request)
        .then(response => {
            // Cache hit - return response
            if (response) {
                return response;
            }
            // Not in cache - fetch from network
            return fetch(event.request);
        })
    );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/')
  );
});

