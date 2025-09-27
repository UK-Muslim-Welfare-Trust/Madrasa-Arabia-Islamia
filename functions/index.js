// functions/index.js

const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { logger } = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

/**
 * This function triggers whenever a new document is created in the announcements collection,
 * using the modern (v2) syntax.
 */
exports.sendAnnouncementNotification = onDocumentCreated(
  "artifacts/masjid-connect-app/public/data/announcements/{announcementId}",
  async (event) => {
    logger.log("New announcement created, preparing to send notification...");

    // Get the data from the event object
    const announcement = event.data.data();

    if (!announcement) {
      logger.log("No data found in the event payload. Exiting function.");
      return;
    }

    logger.log("Announcement data:", announcement);

    // 1. Construct the notification payload
    const payload = {
      notification: {
        title: announcement.title || "New Announcement",
        body: announcement.message,
        icon: "/fav192.png", // The user's device fetches this from your website
      },
    };

    // 2. Get all subscribed user tokens from the 'fcmTokens' collection
    const tokensSnapshot = await admin.firestore().collection("fcmTokens").get();
    if (tokensSnapshot.empty) {
      logger.log("No FCM tokens found. No notifications will be sent.");
      return;
    }

    const tokens = tokensSnapshot.docs.map(doc => doc.id);
    logger.log(`Sending notification to ${tokens.length} device(s).`);

    // 3. Send the message to all tokens and handle cleanup of invalid tokens
    const response = await admin.messaging().sendToDevice(tokens, payload);
    
    const tokensToRemove = [];
    response.results.forEach((result, index) => {
      const error = result.error;
      if (error) {
        logger.error("Failure sending notification to", tokens[index], error);
        if (
          error.code === "messaging/invalid-registration-token" ||
          error.code === "messaging/registration-token-not-registered"
        ) {
          tokensToRemove.push(tokensSnapshot.docs[index].ref.delete());
        }
      }
    });

    return Promise.all(tokensToRemove);
  }
);