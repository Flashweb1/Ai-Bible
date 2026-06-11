import admin from 'firebase-admin';

const DAILY_VERSES = [
  { ref: 'John 3:16', text: 'For God so loved the world, that he gave his only begotten Son.' },
  { ref: 'Psalm 23:1', text: 'The LORD is my shepherd; I shall not want.' },
  { ref: 'Philippians 4:13', text: 'I can do all things through Christ which strengtheneth me.' },
  { ref: 'Romans 8:28', text: 'And we know that all things work together for good to them that love God.' },
  { ref: 'Jeremiah 29:11', text: 'For I know the thoughts that I think toward you, saith the LORD, thoughts of peace.' },
  { ref: 'Proverbs 3:5', text: 'Trust in the LORD with all thine heart.' },
  { ref: 'Matthew 6:33', text: 'But seek ye first the kingdom of God, and his righteousness.' },
];

let firebaseInitialized = false;

export function initFirebaseAdmin() {
  if (firebaseInitialized) return true;

  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccount) {
    console.warn('[Notifications] FIREBASE_SERVICE_ACCOUNT_KEY not set. Push notifications disabled.');
    return false;
  }

  try {
    const credentials = JSON.parse(serviceAccount);
    admin.initializeApp({
      credential: admin.credential.cert(credentials),
    });
    firebaseInitialized = true;
    console.log('[Notifications] Firebase Admin initialized.');
    return true;
  } catch (err) {
    console.error('[Notifications] Failed to initialize Firebase Admin:', err.message);
    return false;
  }
}

export async function registerToken(token) {
  if (!firebaseInitialized) return false;
  try {
    const db = admin.firestore();
    await db.collection('fcm_tokens').doc(token).set({
      token,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return true;
  } catch (err) {
    console.error('[Notifications] Failed to register token:', err.message);
    return false;
  }
}

export async function unregisterToken(token) {
  if (!firebaseInitialized) return;
  try {
    const db = admin.firestore();
    await db.collection('fcm_tokens').doc(token).delete();
  } catch (err) {
    console.error('[Notifications] Failed to unregister token:', err.message);
  }
}

async function getTodayVerse() {
  const start = new Date(new Date().getFullYear(), 0, 0);
  const diff = Date.now() - start;
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);
  return DAILY_VERSES[dayOfYear % DAILY_VERSES.length];
}

async function sendPushToToken(token, verse) {
  try {
    const message = {
      token,
      notification: {
        title: 'Verse of the Day',
        body: `${verse.ref} — ${verse.text}`,
      },
      data: {
        ref: verse.ref,
        text: verse.text,
      },
    };
    await admin.messaging().send(message);
    return true;
  } catch (err) {
    if (err.code === 'messaging/registration-token-not-registered' ||
        err.code === 'messaging/invalid-registration-token') {
      await unregisterToken(token);
    }
    return false;
  }
}

export async function sendDailyVerse() {
  if (!firebaseInitialized) {
    console.warn('[Notifications] Firebase not initialized, skipping daily verse.');
    return;
  }

  try {
    const verse = await getTodayVerse();
    const db = admin.firestore();
    const snapshot = await db.collection('fcm_tokens').get();

    if (snapshot.empty) {
      console.log('[Notifications] No registered tokens. Skipping daily verse.');
      return;
    }

    let sent = 0;
    const promises = [];
    snapshot.forEach((doc) => {
      const { token } = doc.data();
      if (token) {
        promises.push(sendPushToToken(token, verse));
      }
    });

    const results = await Promise.allSettled(promises);
    sent = results.filter(r => r.status === 'fulfilled' && r.value).length;
    console.log(`[Notifications] Daily verse sent to ${sent}/${snapshot.size} tokens.`);
  } catch (err) {
    console.error('[Notifications] Failed to send daily verse:', err.message);
  }
}
