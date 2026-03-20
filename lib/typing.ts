import {
  doc,
  setDoc,
  deleteDoc,
  collection,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { logger } from '@/lib/logger';
import type { TypingStatus } from '@/types';

const TYPING_EXPIRY_MS = 5000;

export async function setTyping(
  roomId: string,
  uid: string,
  displayName: string
): Promise<void> {
  try {
    const ref = doc(db, 'rooms', roomId, 'typing', uid);
    await setDoc(ref, {
      uid,
      displayName,
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    logger.warn('Failed to set typing status:', error);
  }
}

export async function clearTyping(
  roomId: string,
  uid: string
): Promise<void> {
  try {
    const ref = doc(db, 'rooms', roomId, 'typing', uid);
    await deleteDoc(ref);
  } catch (error) {
    logger.warn('Failed to clear typing status:', error);
  }
}

export function subscribeToTyping(
  roomId: string,
  currentUid: string,
  onUpdate: (typers: TypingStatus[]) => void
): () => void {
  const ref = collection(db, 'rooms', roomId, 'typing');

  const unsubscribe = onSnapshot(
    ref,
    (snapshot) => {
      const now = Date.now();
      const active: TypingStatus[] = [];

      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as TypingStatus;

        if (data.uid === currentUid) return;

        if (data.timestamp) {
          const tsMs = (data.timestamp as Timestamp).toMillis();
          if (now - tsMs > TYPING_EXPIRY_MS) return;
        }

        active.push(data);
      });

      onUpdate(active);
    },
    (error) => {
      logger.warn('Typing subscription error:', error);
      onUpdate([]);
    }
  );

  return unsubscribe;
}

export function formatTypingLabel(typers: TypingStatus[]): string {
  if (typers.length === 0) return '';
  const first = typers[0];
  if (typers.length === 1) return `${first!.displayName} is typing...`;
  const second = typers[1];
  if (typers.length === 2)
    return `${first!.displayName} and ${second!.displayName} are typing...`;
  return `${typers.length} people are typing...`;
}
