// IMPORTANT: This file must be placed in the ROOT directory of your website.

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

// Initialize Firebase app and messaging
const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

// --- 1. FIREBASE BACKGROUND MESSAGE HANDLER ---
onBackgroundMessage(messaging, (payload) => {
    console.log('[Service Worker] Received background message: ', payload);

    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: '/assets/img/fav192.png' // Ensure this path is correct from the root
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});


// --- 2. CACHING AND LIFECYCLE ---

const CACHE_NAME = 'wcm-cache-v5'; // Increment version on any change to the asset list
const urlsToCache = [
  // Foundational Files
  '/',
  '/index.html',
  '/manifest.json',

  // Pages
  '/prayerTimetable.html',
  '/donations.html',
  '/login.html',

  // Styles (Ensure all your CSS is bundled here or add individual files)
  '/css/style.css', // Assuming this is your main stylesheet
  '/bootstrap/css/bootstrap.min.css',

  // Scripts
  '/js/js/donation.min.js',
  '/js/js/app.mjs',
  '/js/js/firebase-init.mjs',
  '/js/js/indexScript.mjs',

  // Key Images
  '/img/logo-mosque.svg', // Double-check this path
  '/fav192.png',
  '/fav512.png',
  
  // External Libraries
  'https://ajax.googleapis.com/ajax/libs/jquery/3.6.1/jquery.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.10.0/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Dancing+Script&family=Playfair+Display:wght@500&family=Work+Sans&display=swap'
];

// INSTALL: Pre-cache all the essential assets for offline use.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Caching shell assets.');
        return cache.addAll(urlsToCache).catch(err => {
            console.error("[Service Worker] Failed to cache some assets during install:", err);
        });
      })
  );
});

// ACTIVATE: Clean up old, unused caches.
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// FETCH: Serve assets from cache or network.
self.addEventListener('fetch', event => {
    // Always go to the network for APIs and Firebase services.
    if (event.request.url.includes('firebase') || event.request.url.includes('aladhan.com')) {
        return event.respondWith(fetch(event.request));
    }

    // For HTML pages, use a "Network First, falling back to Cache" strategy.
    // This ensures users always get the latest version of the page if online.
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request).catch(() => {
                console.log('[Service Worker] Fetch failed, returning cached page for:', event.request.url);
                return caches.match(event.request);
            })
        );
        return;
    }

    // For all other requests (CSS, JS, images), use a "Cache First" strategy.
    // This is fast and efficient for static assets.
    event.respondWith(
        caches.match(event.request).then(response => {
            return response || fetch(event.request);
        })
    );
});

// --- 3. NOTIFICATION CLICK HANDLER ---
self.addEventListener('notificationclick', event => {
  console.log('[Service Worker] Notification clicked.');
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/')
  );
});