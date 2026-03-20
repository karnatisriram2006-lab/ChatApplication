'use client';

import { useEffect } from 'react';
import { markRoomAsRead } from '@/lib/readReceipts';

/**
 * Call markRoomAsRead once when the user opens a room.
 * Re-runs if roomId or currentUid changes (i.e. user switches rooms).
 */
export function useReadReceipts(
  roomId: string | null,
  currentUid: string | null
): void {
  useEffect(() => {
    if (!roomId || !currentUid) return;

    const timer = setTimeout(() => {
      markRoomAsRead(roomId, currentUid);
    }, 300);

    return () => clearTimeout(timer);
  }, [roomId, currentUid]);
}
