// firebase-messaging-sw.js

import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js';
import { getMessaging, onBackgroundMessage } from 'https://www.gstatic.com/firebasejs/12.3.0/firebase-messaging-sw.js';
// The local scheduling import is no longer needed.
// import { fetchAndScheduleJamaatReminders } from '/assets/js/js/notifications.mjs';

// --- 1. FIREBASE INITIALIZATION & MESSAGE HANDLING ---
const firebaseConfig = {
    apiKey: "AIzaSyDuq7jYQcKDKY3UWNxQwP51fKRwjCERuvo",
    authDomain: "wakefield-central-mosque.firebaseapp.com",
    projectId: "wakefield-central-mosque",
    storageBucket: "wakefield-central-mosque.appspot.com",
    messagingSenderId: "998395111777",
    appId: "1:998395111777:web:5492302e7279822d5cbd20",
    measurementId: "G-NXER4ENDE0"
};

const app = initializeApp(firebaseConfig);
getMessaging(app);

onBackgroundMessage(getMessaging(), (payload) => {
    console.log('[SW] Background message received:', payload);

    // The logic to trigger local scheduling is now removed.
    // The service worker's only job is to show the notification sent from the cloud.
    if (payload.notification) {
        console.log('[SW] Displaying visible notification.');
        return self.registration.showNotification(
            payload.notification.title,
            {
                body: payload.notification.body,
                icon: payload.notification.icon || '/fav192.png'
            }
        );
    }
});


// --- 2. CACHING AND LIFECYCLE ---
const CACHE_NAME = 'wcm-cache-v2';
const urlsToCache = [
  '/', '/index.html', '/donations.html', '/login.html', '/prayerTimetable.html',
  '/prayerView.html', '/admin/admin.html', '/manifest.json',
  '/assets/css/styles.min.css', '/assets/js/script.min.js', '/assets/js/js/donation.min.js',
  '/assets/js/js/app.mjs', '/assets/js/js/firebase-init.mjs', '/assets/js/js/auth.mjs',
  '/assets/js/js/indexScript.mjs', '/assets/js/js/prayerTimetable.mjs', '/assets/js/js/login.mjs',
  '/assets/js/js/adminScript.mjs', '/assets/js/js/notifications.mjs', '/assets/img/fav192.png',
  '/assets/img/fav512.png', '/assets/img/img/logo-mosque.svg', '/assets/img/img/hero-bg.jpg',
  '/assets/img/img/qr-donate.svg', '/fav192.png', '/fav512.png',
  '/assets/img/lib/lightbox/images/close.png', '/assets/img/lib/lightbox/images/loading.gif',
  '/assets/img/lib/lightbox/images/next.png', '/assets/img/lib/lightbox/images/prev.png',
  '/assets/img/lib/owlcarousel/assets/owl.video.play.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache).catch(err => {
        console.error("[SW] Failed to cache some assets during install:", err);
      });
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME).map(name => caches.delete(name))
      );
    })
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (url.protocol.startsWith('http')) {
    if (event.request.url.includes('firebase') || event.request.url.includes('aladhan.com')) {
      return; // Always go to network for APIs
    }
    if (event.request.mode === 'navigate') {
      event.respondWith(
        fetch(event.request).catch(() => caches.match(event.request))
      );
      return;
    }
    event.respondWith(
      caches.match(event.request).then(response => response || fetch(event.request))
    );
  }
});

// --- 3. NOTIFICATION CLICK HANDLER ---
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(clients.openWindow('/'));
});