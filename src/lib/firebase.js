import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getMessaging, isSupported } from "firebase/messaging";

const FIREBASE_REQUIRED = ['VITE_FIREBASE_API_KEY', 'VITE_FIREBASE_AUTH_DOMAIN', 'VITE_FIREBASE_PROJECT_ID', 'VITE_FIREBASE_STORAGE_BUCKET', 'VITE_FIREBASE_MESSAGING_SENDER_ID', 'VITE_FIREBASE_APP_ID'];
for (const key of FIREBASE_REQUIRED) {
  if (!import.meta.env[key]) {
    throw new Error(`Missing required env var: ${key}. Check your .env file.`);
  }
}

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Lazily resolved — avoids top-level await (unsupported in build target)
// and handles browsers where Messaging isn't supported (Safari < 16, Firefox).
let _messaging = undefined;
export async function getMessagingInstance() {
  if (_messaging !== undefined) return _messaging;
  try {
    const supported = await isSupported();
    _messaging = supported ? getMessaging(app) : null;
  } catch {
    _messaging = null;
  }
  return _messaging;
}

// Keep a synchronous export for code that already imported `messaging` directly.
// It will be null until getMessagingInstance() has been awaited at least once.
export { _messaging as messaging };

