import {
  collection,
  query,
  where,
  getDocs,
  writeBatch,
  doc,
  arrayUnion,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { logger } from '@/lib/logger';
import type { ReceiptStatus } from '@/types';

const BATCH_LIMIT = 500;

/**
 * Mark all unread messages in a room as read by the current user.
 * Called once when the user opens a chat room.
 * Uses Firestore writeBatch for efficiency.
 */
export async function markRoomAsRead(
  roomId: string,
  currentUid: string
): Promise<void> {
  try {
    const messagesRef = collection(db, 'messages');

    // TODO: For rooms with 1000+ messages, add
    // where('createdAt', '>=', oneDayAgo) to limit query scope.
    const q = query(
      messagesRef,
      where('roomId', '==', roomId),
      where('author', '!=', currentUid)
    );

    const snapshot = await getDocs(q);

    const unread = snapshot.docs.filter(
      (d) => !(d.data().readBy ?? []).includes(currentUid)
    );

    if (unread.length === 0) return;

    for (let i = 0; i < unread.length; i += BATCH_LIMIT) {
      const chunk = unread.slice(i, i + BATCH_LIMIT);
      const batch = writeBatch(db);
      chunk.forEach((d) => {
        batch.update(doc(db, 'messages', d.id), {
          readBy: arrayUnion(currentUid),
        });
      });
      await batch.commit();
    }
  } catch (error) {
    logger.warn('markRoomAsRead error:', error);
  }
}

/**
 * Compute the receipt status for a single message.
 * For 1v1 chats, pass participants as [senderUid, recipientUid].
 * For group chats, pass all member uids.
 */
export function getReceiptStatus(
  message: { author: string; readBy?: string[] },
  participants: string[]
): ReceiptStatus {
  const readBy = message.readBy ?? [];

  const others = participants.filter((uid) => uid !== message.author);

  if (others.length === 0) return 'sent';

  const allRead = others.every((uid) => readBy.includes(uid));
  if (allRead) return 'read';

  const anyRead = others.some((uid) => readBy.includes(uid));
  if (anyRead) return 'delivered';

  return 'sent';
}

/**
 * Count how many non-author participants have read a message.
 * Used for group chat receipt counts.
 */
export function getReaderCount(
  message: { author: string; readBy?: string[] },
  participants: string[]
): number {
  const readBy = message.readBy ?? [];
  return participants.filter(
    (uid) => uid !== message.author && readBy.includes(uid)
  ).length;
}
