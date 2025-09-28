// js/js/app.mjs

import { subscribeToTopic, unsubscribeFromTopic, fetchAndScheduleJamaatReminders } from "./notifications.mjs";
import { app } from "./firebase-init.mjs";

let deferredInstallPrompt = null;
let swRegistration = null;

// --- [UNCHANGED FUNCTIONS] ---
function isIOS() { return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream; }
function setupInstallButton() {
    const installButton = document.getElementById('install-button');
    if (!installButton) return;
    installButton.style.display = 'none';
    if (isIOS()) {
        installButton.style.display = 'block';
        installButton.addEventListener('click', () => { alert('To install, tap the Share button, then scroll down and tap "Add to Home Screen".'); });
    } else {
        window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredInstallPrompt = e; installButton.style.display = 'block'; });
        installButton.addEventListener('click', async () => { if (deferredInstallPrompt) { deferredInstallPrompt.prompt(); deferredInstallPrompt = null; installButton.style.display = 'none'; } });
    }
}
const initJQueryPlugins = () => { if (typeof jQuery === 'undefined') return; const $ = jQuery; $("#spinner").removeClass("show"); $(window).scroll(function() { if ($(this).scrollTop() > 300) { $(".sticky-top").addClass("shadow-sm").css("top", "0px"); } else { $(".sticky-top").removeClass("shadow-sm").css("top", "-150px"); } if ($(this).scrollTop() > 100) $('.back-to-top').fadeIn('slow'); else $('.back-to-top').fadeOut('slow'); }); $('.back-to-top').click(() => { $('html, body').animate({ scrollTop: 0 }, 1500, 'easeInOutExpo'); return false; }); };
// The toggle setup function remains the same as the last version with the race-condition fix.
function setupNotificationToggles() {
    const jamaatToggle = document.getElementById('jamaat-notifications-toggle');
    const jamaatSpinner = document.getElementById('jamaat-spinner');
    if (jamaatToggle) {
        jamaatToggle.checked = localStorage.getItem('jamaatNotificationsEnabled') === 'true';
        jamaatToggle.addEventListener('change', async (e) => {
            e.target.disabled = true;
            if (jamaatSpinner) jamaatSpinner.classList.remove('d-none');
            try { if (e.target.checked) { const success = await subscribeToTopic('jamaat', swRegistration); if (!success) e.target.checked = false; localStorage.setItem('jamaatNotificationsEnabled', String(success)); } else { await unsubscribeFromTopic('jamaat', swRegistration); localStorage.setItem('jamaatNotificationsEnabled', 'false'); } } finally { e.target.disabled = false; if (jamaatSpinner) jamaatSpinner.classList.add('d-none'); }
        });
    }
    const toggleContainer = document.getElementById('announcement-toggle-container');
    const announcementToggle = document.getElementById('announcement-notifications-toggle-main');
    const announcementSpinner = document.getElementById('announcement-spinner');
    if (toggleContainer && announcementToggle && window.matchMedia('(display-mode: standalone)').matches) {
        toggleContainer.style.display = 'block';
        announcementToggle.checked = localStorage.getItem('announcementNotificationsEnabled') === 'true';
        announcementToggle.addEventListener('change', async (e) => {
            e.target.disabled = true;
            if (announcementSpinner) announcementSpinner.classList.remove('d-none');
            try { if (e.target.checked) { const success = await subscribeToTopic('announcements', swRegistration); if (!success) e.target.checked = false; localStorage.setItem('announcementNotificationsEnabled', String(success)); } else { await unsubscribeFromTopic('announcements', swRegistration); localStorage.setItem('announcementNotificationsEnabled', 'false'); } } finally { e.target.disabled = false; if (announcementSpinner) announcementSpinner.classList.add('d-none'); }
        });
    }
}
// --- [END OF UNCHANGED FUNCTIONS] ---


// --- MODIFIED FUNCTION WITH DEBUG LOGS ---
function handleFirstLaunchPrompt() {
    console.log("DEBUG: handleFirstLaunchPrompt function called.");

    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const setupComplete = localStorage.getItem('notificationSetupComplete');

    console.log(`DEBUG: Is standalone? ${isStandalone}`);
    console.log(`DEBUG: Is setup complete? ${setupComplete}`);

    if (isStandalone && !setupComplete) {
        console.log("DEBUG: Conditions met. Attempting to show modal.");

        const modalEl = document.getElementById('notification-prompt-modal');
        const saveBtn = document.getElementById('enable-notifications-btn');
        const announcementsCheck = document.getElementById('subscribeAnnouncementsModal');
        const jamaatCheck = document.getElementById('subscribeJamaatModal');
        const spinner = document.getElementById('notification-modal-spinner');
        
        // This will tell us if an element is missing
        console.log("DEBUG: Checking for modal elements:", { modalEl, saveBtn, announcementsCheck, jamaatCheck, spinner });

        if (!modalEl || !saveBtn || !announcementsCheck || !jamaatCheck || !spinner) {
            console.error("DEBUG: One or more modal elements NOT FOUND. The modal cannot be shown.");
            return;
        }
        
        try {
            const notificationModal = new bootstrap.Modal(modalEl);
            notificationModal.show();
            console.log("DEBUG: Modal should now be visible.");
        } catch (error) {
            console.error("DEBUG: Error showing Bootstrap modal. Is Bootstrap's JS loaded?", error);
            return;
        }

        saveBtn.addEventListener('click', async () => {
            spinner.classList.remove('d-none');
            saveBtn.disabled = true;
            try {
                let success = false;
                if (announcementsCheck.checked && await subscribeToTopic('announcements', swRegistration)) { localStorage.setItem('announcementNotificationsEnabled', 'true'); success = true; }
                if (jamaatCheck.checked && await subscribeToTopic('jamaat', swRegistration)) { localStorage.setItem('jamaatNotificationsEnabled', 'true'); success = true; }
                if (success) { localStorage.setItem('notificationSetupComplete', 'true'); alert('Notification settings saved!'); } else if (announcementsCheck.checked || jamaatCheck.checked) { alert("Could not enable notifications. Please grant permission when prompted."); }
                
                // Manually find the modal instance and hide it if it exists
                const modalInstance = bootstrap.Modal.getInstance(modalEl);
                if(modalInstance) modalInstance.hide();

            } finally {
                spinner.classList.add('d-none');
                saveBtn.disabled = false;
            }
        });
    } else {
        console.log("DEBUG: Conditions NOT met. Modal will not be shown.");
    }
}

// --- MAIN EXECUTION BLOCK ---
document.addEventListener('DOMContentLoaded', async () => {
    console.log("DEBUG: DOMContentLoaded. App starting.");

    if ('serviceWorker' in navigator) {
        try {
            swRegistration = await navigator.serviceWorker.register("/firebase-messaging-sw.js", { type: "module" });
            console.log('DEBUG: ServiceWorker registration successful.');
        } catch (err) {
            console.error('DEBUG: ServiceWorker registration failed:', err);
        }
    }

    if (window.matchMedia('(display-mode: standalone)').matches) {
        console.log("DEBUG: App is in standalone mode. Running installed-app logic.");
        const installButton = document.getElementById('install-button');
        if (installButton) installButton.style.display = 'none';
        
        const notificationControls = document.getElementById('notification-controls');
        if (notificationControls) notificationControls.style.display = 'block';
        
        handleFirstLaunchPrompt();
        setupNotificationToggles();

        if (localStorage.getItem('jamaatNotificationsEnabled') === 'true' && swRegistration) {
            fetchAndScheduleJamaatReminders();
        }
    } else {
        console.log("DEBUG: App is in browser mode. Setting up install button.");
        setupInstallButton();
        const notificationControls = document.getElementById('notification-controls');
        if (notificationControls) notificationControls.style.display = 'none';
    }
    
    initJQueryPlugins();
});
