// js/js/app.mjs

import { subscribeToTopic, unsubscribeFromTopic, fetchAndScheduleJamaatReminders } from "./notifications.mjs";
import { initializeApp } from "./firebase-init.mjs";

let deferredInstallPrompt = null;

function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

function setupInstallButton() {
    const installButton = document.getElementById('install-button');
    if (!installButton) return;
    installButton.style.display = 'none';

    if (isIOS()) {
        installButton.style.display = 'block';
        installButton.addEventListener('click', () => {
            alert('To install, tap the Share button, then scroll down and tap "Add to Home Screen".');
        });
    } else {
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredInstallPrompt = e;
            installButton.style.display = 'block';
        });
        installButton.addEventListener('click', async () => {
            if (deferredInstallPrompt) {
                deferredInstallPrompt.prompt();
                deferredInstallPrompt = null;
                installButton.style.display = 'none';
            }
        });
    }
}

function handleFirstLaunchPrompt(swRegistration) {
    if (window.matchMedia('(display-mode: standalone)').matches && !localStorage.getItem('notificationSetupComplete')) {
        const modalEl = document.getElementById('notification-prompt-modal');
        const saveBtn = document.getElementById('enable-notifications-btn');
        const announcementsCheck = document.getElementById('subscribeAnnouncementsModal');
        const jamaatCheck = document.getElementById('subscribeJamaatModal');
        const spinner = document.getElementById('notification-modal-spinner');

        if (!modalEl || !saveBtn || !announcementsCheck || !jamaatCheck || !spinner) return;
        
        const notificationModal = new bootstrap.Modal(modalEl);
        notificationModal.show();

        saveBtn.addEventListener('click', async () => {
            spinner.classList.remove('d-none');
            saveBtn.disabled = true;
            try {
                let success = false;
                if (announcementsCheck.checked && await subscribeToTopic('announcements', swRegistration)) {
                    localStorage.setItem('announcementNotificationsEnabled', 'true');
                    success = true;
                }
                if (jamaatCheck.checked && await subscribeToTopic('jamaat', swRegistration)) {
                    localStorage.setItem('jamaatNotificationsEnabled', 'true');
                    success = true;
                }
                if (success) {
                    localStorage.setItem('notificationSetupComplete', 'true');
                    alert('Notification settings saved!');
                } else if (announcementsCheck.checked || jamaatCheck.checked) {
                    alert("Could not enable notifications. Please grant permission when prompted.");
                }
                notificationModal.hide();
            } finally {
                spinner.classList.add('d-none');
                saveBtn.disabled = false;
            }
        });
    }
}

function setupNotificationToggles(swRegistration) {
    // Prayer Timetable Page Toggle
    if (window.location.pathname.includes("prayerTimetable.html")) {
        const jamaatToggle = document.getElementById('jamaat-notifications-toggle');
        if (jamaatToggle) {
            jamaatToggle.checked = localStorage.getItem('jamaatNotificationsEnabled') === 'true';
            jamaatToggle.addEventListener('change', async (e) => {
                if (e.target.checked) {
                    const success = await subscribeToTopic('jamaat', swRegistration);
                    if (!success) e.target.checked = false;
                    localStorage.setItem('jamaatNotificationsEnabled', String(success));
                } else {
                    await unsubscribeFromTopic('jamaat', swRegistration);
                    localStorage.setItem('jamaatNotificationsEnabled', 'false');
                }
            });
        }
    }

    // Main Index Page Toggle
    const toggleContainer = document.getElementById('announcement-toggle-container');
    const announcementToggle = document.getElementById('announcement-notifications-toggle-main');
    if (toggleContainer && announcementToggle && window.matchMedia('(display-mode: standalone)').matches) {
        toggleContainer.style.display = 'block';
        announcementToggle.checked = localStorage.getItem('announcementNotificationsEnabled') === 'true';
        announcementToggle.addEventListener('change', async (e) => {
            if (e.target.checked) {
                const success = await subscribeToTopic('announcements', swRegistration);
                if (!success) e.target.checked = false;
                localStorage.setItem('announcementNotificationsEnabled', String(success));
            } else {
                await unsubscribeFromTopic('announcements', swRegistration);
                localStorage.setItem('announcementNotificationsEnabled', 'false');
            }
        });
    }
}

const initJQueryPlugins = () => {
    // Your existing jQuery UI setup function, unchanged.
};

document.addEventListener('DOMContentLoaded', async () => {
    let swRegistration = null;
    if ('serviceWorker' in navigator) {
        try {
            swRegistration = await navigator.serviceWorker.register("/firebase-messaging-sw.js", { type: "module" });
        } catch (err) {
            console.error('ServiceWorker registration failed:', err);
        }
    }

    if (window.matchMedia('(display-mode: standalone)').matches) {
        document.getElementById('install-button')?.style.setProperty('display', 'none', 'important');
        document.getElementById('notification-controls')?.style.display = 'block';
        if (swRegistration) {
            handleFirstLaunchPrompt(swRegistration);
            setupNotificationToggles(swRegistration);
            if (localStorage.getItem('jamaatNotificationsEnabled') === 'true') {
                fetchAndScheduleJamaatReminders(); // Proactive schedule on app start
            }
        }
    } else {
        setupInstallButton();
        document.getElementById('notification-controls')?.style.display = 'none';
    }
    
    initJQueryPlugins();
});