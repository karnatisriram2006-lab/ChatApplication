'use client';

import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';

interface NotificationPermissionBannerProps {
  permissionState: NotificationPermission | 'unsupported';
  onAllow: () => Promise<void>;
}

export default function NotificationPermissionBanner({ permissionState, onAllow }: NotificationPermissionBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('notif-banner-dismissed')) setDismissed(true);
  }, []);

  const handleDismiss = () => {
    localStorage.setItem('notif-banner-dismissed', '1');
    setDismissed(true);
  };

  const handleAllow = async () => {
    await onAllow();
    handleDismiss();
  };

  if (dismissed || permissionState === 'granted' || permissionState === 'denied' || permissionState === 'unsupported') {
    return null;
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-primary/10 border-b border-primary/20">
      <Bell size={16} className="text-primary flex-shrink-0" />
      <p className="flex-1 text-[13px] text-text-primary">Enable notifications to get alerts for new messages</p>
      <button onClick={handleAllow} className="px-3 py-1.5 primary-gradient text-white text-[12px] font-bold rounded-full cursor-pointer">
        Allow
      </button>
      <button onClick={handleDismiss} className="text-text-muted hover:text-text-primary cursor-pointer text-lg leading-none">×</button>
    </div>
  );
}
