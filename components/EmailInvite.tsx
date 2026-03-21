'use client';

import { useState } from 'react';
import { db, auth } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Mail, Send, Check, Loader2 } from 'lucide-react';

interface EmailInviteProps {
  senderName: string;
  senderUid: string;
}

export default function EmailInvite({ senderName, senderUid }: EmailInviteProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSend = async () => {
    const trimmed = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      setError('Enter a valid email address');
      return;
    }

    if (!auth.currentUser) {
      setError('You must be signed in to send invites');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Send the email
      const res = await fetch('/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed, senderName }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to send');
      }

      // Store the invite in Firestore so it auto-connects on signup
      await addDoc(collection(db, 'emailInvites'), {
        email: trimmed,
        senderUid,
        senderName,
        senderPhone: auth.currentUser.phoneNumber || null,
        status: 'pending',
        createdAt: serverTimestamp(),
      });

      setSent(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send invite';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px 16px', borderTop: '0.5px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <Mail size={16} style={{ color: 'var(--text-secondary)' }} />
        <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)', margin: 0 }}>
          Invite by email
        </p>
      </div>

      <p style={{
        fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 12px', lineHeight: 1.5,
      }}>
        Can&apos;t find them by phone? Send them an invite. They&apos;ll be added to your contacts when they sign up.
      </p>

      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          type="email"
          placeholder="friend@example.com"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setError(''); setSent(false); }}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          disabled={sent}
          style={{
            flex: 1, padding: '10px 14px', fontSize: '14px', borderRadius: '10px',
            border: '0.5px solid var(--border)', background: 'var(--surface-2)',
            color: 'var(--text-primary)', outline: 'none',
            opacity: sent ? 0.5 : 1,
          }}
        />
        <button
          onClick={handleSend}
          disabled={loading || sent}
          style={{
            padding: '10px 16px', borderRadius: '10px', border: 'none',
            background: sent ? 'var(--surface-elevated)' : '#25D366',
            color: sent ? 'var(--text-secondary)' : '#fff',
            fontSize: '13px', fontWeight: 500, cursor: sent ? 'default' : 'pointer',
            opacity: loading ? 0.6 : 1, flexShrink: 0,
            display: 'flex', alignItems: 'center', gap: '6px',
          }}
        >
          {loading ? (
            <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
          ) : sent ? (
            <><Check size={14} /> Sent</>
          ) : (
            <><Send size={14} /> Send</>
          )}
        </button>
      </div>

      {error && (
        <p style={{ fontSize: '12px', color: 'var(--color-error)', margin: '8px 0 0' }}>{error}</p>
      )}

      {sent && (
        <p style={{ fontSize: '12px', color: '#25D366', margin: '8px 0 0' }}>
          Invite sent! They&apos;ll be added to your contacts when they sign up.
        </p>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
