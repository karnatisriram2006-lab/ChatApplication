'use client';

import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import type { ToastNotification } from '@/hooks/usePushNotifications';

interface NotificationToastProps {
  toasts: ToastNotification[];
  onDismiss: (id: string) => void;
}

export default function NotificationToast({ toasts, onDismiss }: NotificationToastProps) {
  const router = useRouter();

  if (toasts.length === 0) return null;

  const handleClick = (toast: ToastNotification) => {
    if (!toast.roomId) return;

    // For 1-on-1 rooms (uid_uid format), navigate to the other user
    // For group rooms, the roomId is the groupId
    const parts = toast.roomId.split('_');
    let chatUid = toast.roomId;
    if (parts.length === 2 && toast.author) {
      const otherUid = parts[0] === toast.author ? parts[1] : parts[0];
      if (otherUid) chatUid = otherUid;
    }

    router.push(`/chat/${chatUid}`);
    onDismiss(toast.id);
  };

  return (
    <div className="fixed top-4 right-4 z-[300] flex flex-col gap-2 max-w-[320px] w-full">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          onClick={() => handleClick(toast)}
          className="glass rounded-xl p-3 shadow-premium border-glass-border animate-scaleIn cursor-pointer flex items-start gap-3"
        >
          <div className="w-9 h-9 rounded-full primary-gradient flex items-center justify-center flex-shrink-0">
            <span className="text-white font-black text-sm">C</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold text-text-primary truncate">{toast.title}</p>
            <p className="text-[12px] text-text-secondary line-clamp-2">{toast.body}</p>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onDismiss(toast.id); }}
            className="text-text-muted hover:text-text-primary flex-shrink-0"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
