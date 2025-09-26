// functions/index.js
const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

/**
 * This function triggers whenever a new announcement is created in Firestore.
 */
exports.sendAnnouncementNotification = functions.firestore
  .document("artifacts/masjid-connect-app/public/data/announcements/{announcementId}")
  .onCreate(async (snap, context) => {
    const announcement = snap.data();
    console.log("New announcement detected:", announcement);

    // Prepare the notification message
    const payload = {
      notification: {
        title: announcement.title || "New Announcement",
        body: announcement.message,
        icon: "/fav192.png", // This path must be from the root of your domain
      },
    };

    // Get the list of all user notification tokens
    const tokensSnapshot = await admin.firestore().collection("fcmTokens").get();
    if (tokensSnapshot.empty) {
      console.log("No user tokens found. Notification not sent.");
      return;
    }

    const tokens = tokensSnapshot.docs.map(doc => doc.id);
    console.log(`Sending notification to ${tokens.length} device(s).`);

    // Send the notification to all tokens
    return admin.messaging().sendToDevice(tokens, payload);
  });