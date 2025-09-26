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
        icon: '/fav192.png' // Icon must be at the root of your site
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});


// --- 2. CACHING AND LIFECYCLE ---

// Increment the version number whenever you update this file
const CACHE_NAME = 'wcm-cache-v2'; 
const urlsToCache = [
  // --- Foundational & HTML Pages ---
  '/',
  '/index.html',
  '/donations.html',
  '/login.html',
  '/prayerTimetable.html',
  '/prayerView.html',
  '/admin/admin.html',
  '/manifest.json',

  // --- Stylesheets ---
  '/assets/css/styles.min.css',

  // --- Core Scripts ---
  '/assets/js/script.min.js',
  '/assets/js/js/donation.min.js',
  
  // --- Module Scripts ---
  '/assets/js/js/app.mjs',
  '/assets/js/js/firebase-init.mjs',
  '/assets/js/js/auth.mjs',
  '/assets/js/js/indexScript.mjs',
  '/assets/js/js/prayerTimetable.mjs',
  '/assets/js/js/login.mjs',
  '/assets/js/js/adminScript.mjs',
  '/assets/js/js/notifications.mjs',

  // --- Key Images & Icons ---
  '/assets/img/fav192.png',
  '/assets/img/fav512.png',
  '/assets/img/img/logo-mosque.svg',
  '/assets/img/img/hero-bg.jpg',
  '/assets/img/img/qr-donate.svg',
  '/fav192.png',
  '/fav512.png',

  // --- Supporting Library Images for a better offline experience ---
  '/assets/img/lib/lightbox/images/close.png',
  '/assets/img/lib/lightbox/images/loading.gif',
  '/assets/img/lib/lightbox/images/next.png',
  '/assets/img/lib/lightbox/images/prev.png',
  '/assets/img/lib/owlcarousel/assets/owl.video.play.png'
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
        // Let the request continue to the network without intervention.
        return;
    }
    // For HTML pages, use a "Network First, falling back to Cache" strategy.
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request).catch(() => {
                console.log('[Service Worker] Network fetch failed, returning cached page for:', event.request.url);
                return caches.match(event.request);
            })
        );
        return;
    }

    // For all other requests (CSS, JS, images), use a "Cache First" strategy.
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