'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Timestamp } from 'firebase/firestore';
import type { TypingStatus } from '@/types';
import {
  setTyping,
  clearTyping,
  subscribeToTyping,
  formatTypingLabel,
} from '@/lib/typing';

const TYPING_DEBOUNCE_MS = 1500;
const TYPING_EXPIRY_MS = 5000;

interface UseTypingIndicatorReturn {
  onTyping: () => void;
  onStopTyping: () => void;
  typingLabel: string;
  activeTypers: TypingStatus[];
}

export function useTypingIndicator(
  roomId: string | null,
  currentUid: string | null,
  currentDisplayName: string | null
): UseTypingIndicatorReturn {
  const [activeTypers, setActiveTypers] = useState<TypingStatus[]>([]);
  const lastWriteRef = useRef<number>(0);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const expiryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!roomId || !currentUid) return;

    const unsubscribe = subscribeToTyping(roomId, currentUid, (typers) => {
      setActiveTypers(typers);

      if (typers.length > 0) {
        if (expiryTimerRef.current) clearTimeout(expiryTimerRef.current);
        expiryTimerRef.current = setTimeout(() => {
          setActiveTypers((prev) =>
            prev.filter((t) => {
              if (!t.timestamp) return false;
              const tsMs = (t.timestamp as Timestamp).toMillis();
              return Date.now() - tsMs <= TYPING_EXPIRY_MS;
            })
          );
        }, TYPING_EXPIRY_MS);
      }
    });

    return () => {
      unsubscribe();
      if (expiryTimerRef.current) clearTimeout(expiryTimerRef.current);
    };
  }, [roomId, currentUid]);

  const onTyping = useCallback(() => {
    if (!roomId || !currentUid || !currentDisplayName) return;

    const now = Date.now();
    if (now - lastWriteRef.current < TYPING_DEBOUNCE_MS) return;

    lastWriteRef.current = now;
    setTyping(roomId, currentUid, currentDisplayName);

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      clearTyping(roomId, currentUid);
    }, TYPING_EXPIRY_MS);
  }, [roomId, currentUid, currentDisplayName]);

  const onStopTyping = useCallback(() => {
    if (!roomId || !currentUid) return;
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    clearTyping(roomId, currentUid);
  }, [roomId, currentUid]);

  useEffect(() => {
    return () => {
      if (!roomId || !currentUid) return;
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (expiryTimerRef.current) clearTimeout(expiryTimerRef.current);
      clearTyping(roomId, currentUid);
    };
  }, [roomId, currentUid]);

  return {
    onTyping,
    onStopTyping,
    typingLabel: formatTypingLabel(activeTypers),
    activeTypers,
  };
}
