import { useState, useCallback, useEffect, useRef } from "react";
import { db } from "@/lib/firebase";
import {
  collection, query, where, orderBy, limit, onSnapshot,
  doc, writeBatch, type DocumentData,
  startAfter, arrayUnion
} from "firebase/firestore";
import { logger } from "@/lib/logger";
import type { Message } from "@/types/index";

interface UseMessagesOptions {
  roomId: string | null;
  currentUser: string;
  pageSize?: number;
  onNewIncomingMessage?: (message: { author: string; text: string; roomId: string }) => void;
}

interface UseMessagesResult {
  messages: Message[];
  loadMore: () => Promise<void>;
  hasMore: boolean;
  loading: boolean;
  error: Error | null;
}

export function useMessages({ roomId, currentUser, pageSize = 30, onNewIncomingMessage }: UseMessagesOptions): UseMessagesResult {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<DocumentData | null>(null);
  const prevMessageIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!roomId) {
      setMessages([]);
      setHasMore(true);
      setLastDoc(null);
      setLoading(false);
      prevMessageIdsRef.current = new Set();
      return;
    }

    setLoading(true);
    setError(null);

    const q = query(
      collection(db, "messages"),
      where("roomId", "==", roomId),
      orderBy("createdAt", "desc"),
      limit(pageSize)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const msgs: Message[] = [];
        const batch = writeBatch(db);
        let hasUnread = false;

        snapshot.docs.forEach((snap) => {
          const d = snap.data();
          msgs.push({
            id: snap.id,
            roomId: d.roomId,
            author: d.author,
            text: d.text,
            createdAt: d.createdAt,
            editedAt: d.editedAt,
            readBy: d.readBy,
          });
          if (d.author !== currentUser && !(d.readBy ?? []).includes(currentUser)) {
            batch.update(doc(db, "messages", snap.id), { readBy: arrayUnion(currentUser) });
            hasUnread = true;
          }
        });

        if (hasUnread) {
          batch.commit().catch((e: Error) => logger.error("Mark-as-read batch failed:", e));
        }

        // Detect new incoming messages for toast notifications
        if (onNewIncomingMessage) {
          const currentIds = new Set(snapshot.docs.map(d => d.id));
          snapshot.docs.forEach((snap) => {
            const d = snap.data();
            if (!prevMessageIdsRef.current.has(snap.id) && d.author !== currentUser) {
              onNewIncomingMessage({ author: d.author, text: d.text ?? '', roomId: d.roomId });
            }
          });
          prevMessageIdsRef.current = currentIds;
        }

        msgs.reverse();
        setMessages(msgs);

        const lastDocument = snapshot.docs[snapshot.docs.length - 1];
        if (lastDocument) {
          setLastDoc(lastDocument);
        }
        setHasMore(snapshot.docs.length === pageSize);
        setLoading(false);
      },
      (err) => {
        logger.error("Snapshot error:", err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [roomId, currentUser, pageSize]);

  const loadMore = useCallback(async () => {
    if (!roomId || !lastDoc || !hasMore) return;

    setLoading(true);
    try {
      const q = query(
        collection(db, "messages"),
        where("roomId", "==", roomId),
        orderBy("createdAt", "desc"),
        startAfter(lastDoc),
        limit(pageSize)
      );

      const snapshot = await (
        await import("firebase/firestore")
      ).getDocs(q);

      const olderMsgs: Message[] = [];
      snapshot.docs.forEach((snap) => {
        const d = snap.data();
        olderMsgs.push({
          id: snap.id,
          roomId: d.roomId,
          author: d.author,
          text: d.text,
          createdAt: d.createdAt,
          editedAt: d.editedAt,
          readBy: d.readBy,
        });
      });

      olderMsgs.reverse();
      setMessages((prev) => [...olderMsgs, ...prev]);

      const lastDocument = snapshot.docs[snapshot.docs.length - 1];
      if (lastDocument) {
        setLastDoc(lastDocument);
      }
      setHasMore(snapshot.docs.length === pageSize);
    } catch (e) {
      logger.error("loadMore failed:", e);
    } finally {
      setLoading(false);
    }
  }, [roomId, lastDoc, hasMore, pageSize]);

  return { messages, loadMore, hasMore, loading, error };
}
