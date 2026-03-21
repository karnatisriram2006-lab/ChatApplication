'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import AuthGuard from '@/components/AuthGuard';
import EmailInvite from '@/components/EmailInvite';
import { ChevronLeft } from 'lucide-react';

function SearchContent() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  return (
    <div style={{
      maxWidth: '480px', margin: '0 auto', height: '100vh',
      display: 'flex', flexDirection: 'column', background: 'var(--background)',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px',
        borderBottom: '0.5px solid var(--border)',
      }}>
        <button onClick={() => router.back()} style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: '4px',
          color: 'var(--text-primary)',
        }}>
          <ChevronLeft size={20} />
        </button>
        <h2 style={{ fontSize: '17px', fontWeight: 500, margin: 0 }}>Invite a Friend</h2>
      </div>

      <div style={{
        padding: '16px', borderBottom: '0.5px solid var(--border)', background: 'var(--surface-2)',
      }}>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
          Send an invite to a friend&apos;s email address. They&apos;ll be added to your contacts automatically when they sign up.
        </p>
      </div>

      <EmailInvite senderName={user?.displayName ?? 'Someone'} senderUid={user?.uid ?? ''} />
    </div>
  );
}

export default function SearchPage() {
  return (
    <AuthGuard>
      <SearchContent />
    </AuthGuard>
  );
}
