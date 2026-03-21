'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { MessagePayload } from 'firebase/messaging';
import {
  requestNotificationPermission,
  subscribeForegroundMessages,
} from '@/lib/fcm';

export interface ToastNotification {
  id: string;
  title: string;
  body: string;
  roomId?: string;
  author?: string;
}

interface UsePushNotificationsReturn {
  toasts: ToastNotification[];
  permissionState: NotificationPermission | 'unsupported';
  requestPermission: () => Promise<void>;
  dismissToast: (id: string) => void;
}

export function usePushNotifications(
  uid: string | null,
  activeRoomId?: string | null
): UsePushNotificationsReturn {
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const [permissionState, setPermissionState] = useState<NotificationPermission | 'unsupported'>('default');
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('Notification' in window)) {
      setPermissionState('unsupported');
      return;
    }
    setPermissionState(Notification.permission);
  }, []);

  useEffect(() => {
    if (!uid) return;

    subscribeForegroundMessages((payload: MessagePayload) => {
      const { title, body } = payload.notification ?? {};
      const roomId = payload.data?.roomId;

      if (!title && !body) return;

      // Skip if user is already viewing this room
      if (roomId && roomId === activeRoomId) return;

      const toast: ToastNotification = {
        id: crypto.randomUUID(),
        title: title ?? 'New message',
        body: body ?? '',
        roomId,
      };

      setToasts((prev) => [...prev, toast]);

      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toast.id));
      }, 5000);
    }).then((unsub) => {
      unsubscribeRef.current = unsub;
    });

    return () => {
      unsubscribeRef.current?.();
    };
  }, [uid, activeRoomId]);

  const requestPermission = useCallback(async () => {
    if (!uid) return;
    await requestNotificationPermission(uid);
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermissionState(Notification.permission);
    }
  }, [uid]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, permissionState, requestPermission, dismissToast };
}
