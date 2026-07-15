import { getToken, onMessage } from "firebase/messaging";
import { getMessagingInstance } from "./firebase.js";

export async function requestNotificationPermission() {
  try {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  } catch {
    return false;
  }
}

export async function getFCMToken() {
  try {
    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
    if (!vapidKey) {
      console.warn("[Notifications] VITE_FIREBASE_VAPID_KEY not set");
      return null;
    }
    const msg = await getMessagingInstance();
    if (!msg) {
      console.warn("[Notifications] Firebase Messaging not supported in this browser");
      return null;
    }
    const token = await getToken(msg, { vapidKey });
    return token;
  } catch (err) {
    console.warn("[Notifications] Failed to get FCM token:", err);
    return null;
  }
}

export async function registerTokenOnBackend(token) {
  try {
    const baseUrl = import.meta.env.VITE_API_URL || "";
    const res = await fetch(`${baseUrl}/api/notifications/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function unregisterTokenOnBackend(token) {
  try {
    const baseUrl = import.meta.env.VITE_API_URL || "";
    await fetch(`${baseUrl}/api/notifications/unregister`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
  } catch {}
}

export async function onForegroundMessage(callback) {
  const msg = await getMessagingInstance();
  if (!msg) return;
  onMessage(msg, (payload) => {
    callback(payload);
  });
}
