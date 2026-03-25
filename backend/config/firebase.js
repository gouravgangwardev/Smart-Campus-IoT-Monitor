/**
 * Firebase Admin SDK initialization
 * Used for:
 *   - Sending push notifications to mobile/web dashboard on critical alerts
 *   - Auth token verification (optional)
 *
 * Set FIREBASE_SERVICE_ACCOUNT_JSON env var with the JSON string of your
 * Firebase service account credentials.
 */

const admin = require("firebase-admin");

let firebaseInitialized = false;

const initFirebase = () => {
  if (firebaseInitialized) return;

  try {
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
      ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
      : null;

    if (!serviceAccount) {
      console.warn(
        "[Firebase] No service account found. Push notifications disabled."
      );
      return;
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    firebaseInitialized = true;
    console.log("[Firebase] Admin SDK initialized.");
  } catch (err) {
    console.error("[Firebase] Init error:", err.message);
  }
};

/**
 * Send a push notification to a specific FCM token
 * @param {string} token - FCM device/browser token
 * @param {string} title - Notification title
 * @param {string} body  - Notification body
 * @param {object} data  - Optional key-value payload
 */
const sendPushNotification = async (token, title, body, data = {}) => {
  if (!firebaseInitialized) return;

  const message = {
    token,
    notification: { title, body },
    data: Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, String(v)])
    ),
  };

  try {
    const response = await admin.messaging().send(message);
    console.log(`[Firebase] Push sent: ${response}`);
    return response;
  } catch (err) {
    console.error("[Firebase] Push failed:", err.message);
  }
};

module.exports = { initFirebase, sendPushNotification };
