'use client';

import { useEffect, useState } from 'react';

export default function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div style={{
      position: 'sticky',
      top: 0,
      zIndex: 50,
      background: '#854F0B',
      color: '#FAEEDA',
      textAlign: 'center',
      padding: '8px 16px',
      fontSize: '14px',
    }}>
      You are offline — messages will send when reconnected
    </div>
  );
}
