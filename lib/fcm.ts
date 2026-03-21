import { getToken, onMessage } from 'firebase/messaging';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db, messagingPromise } from '@/lib/firebase';
import { logger } from '@/lib/logger';

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

export async function requestNotificationPermission(uid: string): Promise<string | null> {
  try {
    const messaging = await messagingPromise;
    if (!messaging) return null;

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;

    if (!('serviceWorker' in navigator)) return null;

    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration });

    if (!token) return null;

    await updateDoc(doc(db, 'users', uid), {
      fcmTokens: arrayUnion(token),
      fcmTokenUpdatedAt: new Date(),
    });

    return token;
  } catch (error) {
    logger.warn('Failed to get FCM token:', error);
    return null;
  }
}

export async function clearFCMToken(uid: string): Promise<void> {
  try {
    const messaging = await messagingPromise;
    if (!messaging) return;

    const token = await getToken(messaging, { vapidKey: VAPID_KEY });
    if (token) {
      await updateDoc(doc(db, 'users', uid), {
        fcmTokens: arrayRemove(token),
      });
    }
  } catch (error) {
    logger.warn('Failed to clear FCM token:', error);
  }
}

export async function subscribeForegroundMessages(
  onReceive: (payload: import('firebase/messaging').MessagePayload) => void
): Promise<() => void> {
  const messaging = await messagingPromise;
  if (!messaging) return () => {};

  const unsubscribe = onMessage(messaging, onReceive);
  return unsubscribe;
}
