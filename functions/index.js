// functions/index.js

const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { HttpsError, onCall } = require("firebase-functions/v2/https");
const { logger } = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

const db = admin.firestore();
const messaging = admin.messaging();
const ARTIFACTS_PATH = "artifacts/masjid-connect-app/public/data";

/**
 * 1. Callable function for clients to manage their topic subscriptions.
 * This is the corrected version that allows public access.
 */
exports.manageSubscription = onCall({ invoker: "public" }, async (request) => {
  const { token, topic, action } = request.data;

  if (!token || !topic || !action) {
    logger.error("Request was missing required parameters.", { token, topic, action });
    throw new HttpsError("invalid-argument", "Missing required parameters.");
  }

  try {
    if (action === "subscribe") {
      await messaging.subscribeToTopic(token, topic);
      logger.log(`Subscribed token to topic: ${topic}`);
      return { success: true, message: `Successfully subscribed to ${topic}` };
    } else if (action === "unsubscribe") {
      await messaging.unsubscribeFromTopic(token, topic);
      logger.log(`Unsubscribed token from topic: ${topic}`);
      return { success: true, message: `Successfully unsubscribed from ${topic}` };
    } else {
      throw new HttpsError("invalid-argument", "Invalid action specified.");
    }
  } catch (error) {
    logger.error("Error managing subscription:", error);
    throw new HttpsError("internal", "Failed to update subscription.", error);
  }
});

/**
 * 2. Firestore-triggered function to send notifications for new announcements.
 */
exports.sendAnnouncementNotification = onDocumentCreated(
  `${ARTIFACTS_PATH}/announcements/{announcementId}`,
  async (event) => {
    const announcement = event.data.data();
    if (!announcement) {
      logger.log("No announcement data found. Exiting.");
      return;
    }

    logger.log("New announcement detected, sending notification to 'announcements' topic.");
    const payload = {
      notification: {
        title: announcement.title || "New Announcement",
        body: announcement.message,
        icon: "/fav192.png",
      },
      topic: "announcements",
    };

    try {
      await messaging.send(payload);
      logger.log("Announcement notification sent successfully.");
    } catch (error) {
      logger.error("Error sending announcement notification:", error);
    }
  }
);

/**
 * 3. Scheduled function to send Jama'at reminders.
 */
exports.sendJamaatReminders = onSchedule("every 15 minutes", async () => {
  logger.log("Running scheduled job to check for Jama'at reminders.");

  const nowInLondon = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/London" }));
  const currentMinutes = nowInLondon.getHours() * 60 + nowInLondon.getMinutes();
  const isFriday = nowInLondon.getDay() === 5;

  const prayerTimesRef = db.doc(`${ARTIFACTS_PATH}/prayerTimes/today`);
  const prayerTimesDoc = await prayerTimesRef.get();

  if (!prayerTimesDoc.exists) {
    logger.warn("Today's prayer times document not found.");
    return;
  }
  const times = prayerTimesDoc.data();

  const day = String(nowInLondon.getDate()).padStart(2, '0');
  const month = String(nowInLondon.getMonth() + 1).padStart(2, '0');
  const dateId = `${day}-${month}`;
  const calendarRef = db.doc(`${ARTIFACTS_PATH}/prayerCalendar/${dateId}`);
  const calendarDoc = await calendarRef.get();

  if (calendarDoc.exists() && calendarDoc.data().Maghrib) {
    times.Maghrib = calendarDoc.data().Maghrib;
  }

  const prayers = ["Fajr", "Zuhr", "Asr", "Maghrib", "Isha", "Jumma"];

  for (const prayer of prayers) {
    if ((prayer === 'Zuhr' && isFriday) || (prayer === 'Jumma' && !isFriday)) {
      continue;
    }

    const timeStr = times[prayer];
    if (!timeStr || times[`${prayer}_reminderSent`]) {
      continue;
    }

    const [hours, minutes] = timeStr.split(':').map(Number);
    const prayerTotalMinutes = hours * 60 + minutes;
    const timeDifference = prayerTotalMinutes - currentMinutes;

    if (timeDifference >= 15 && timeDifference < 30) {
      logger.log(`Jama'at for ${prayer} is approaching. Sending reminder.`);
      const payload = {
        notification: {
          title: `${prayer} Jama'at Reminder`,
          body: `Jama'at for ${prayer} will begin in approximately 15 minutes.`,
          icon: "/fav192.png",
        },
        topic: "jamaat",
      };
      
      try {
        await messaging.send(payload);
        await prayerTimesRef.update({ [`${prayer}_reminderSent`]: true });
        logger.log(`Successfully sent reminder for ${prayer}.`);
      } catch (error) {
        logger.error(`Failed to send reminder for ${prayer}:`, error);
      }
    }
  }
});

/**
 * 4. Scheduled function to reset the reminder flags for the next day.
 */
exports.resetReminderFlags = onSchedule({
  schedule: "0 3 * * *",
  timeZone: "Europe/London",
}, async () => {
  logger.log("Running daily job to reset reminder flags.");
  const prayerTimesRef = db.doc(`${ARTIFACTS_PATH}/prayerTimes/today`);
  
  try {
    await prayerTimesRef.update({
      Fajr_reminderSent: admin.firestore.FieldValue.delete(),
      Zuhr_reminderSent: admin.firestore.FieldValue.delete(),
      Asr_reminderSent: admin.firestore.FieldValue.delete(),
      Isha_reminderSent: admin.firestore.FieldValue.delete(),
      Maghrib_reminderSent: admin.firestore.FieldValue.delete(),
      Jumma_reminderSent: admin.firestore.FieldValue.delete()
    });
    logger.log("Successfully reset all reminder flags.");
  } catch (error) {
    logger.log("Could not reset flags, probably because they didn't exist.", error.message);
  }
});