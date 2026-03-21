'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { subscribeToIncomingInvites, acceptInvite, declineInvite, maskPhone } from '@/lib/invites';
import AuthGuard from '@/components/AuthGuard';
import type { ChatInvite } from '@/types';
import { ChevronLeft, Check, X } from 'lucide-react';

function InvitesContent() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [invites, setInvites] = useState<ChatInvite[]>([]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToIncomingInvites(user.uid, setInvites);
    return () => unsub();
  }, [user]);

  const handleAccept = async (invite: ChatInvite) => {
    try {
      await acceptInvite(invite);
      router.push(`/chat/${invite.from}`);
    } catch (err) {
      console.error('Accept failed:', err);
    }
  };

  const handleDecline = async (inviteId: string) => {
    setInvites((prev) => prev.filter((i) => i.id !== inviteId));
    try {
      await declineInvite(inviteId);
    } catch {
      // revert on error
    }
  };

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
        <h2 style={{ fontSize: '17px', fontWeight: 500, margin: 0 }}>Invites</h2>
        {invites.length > 0 && (
          <span style={{
            marginLeft: 'auto', fontSize: '11px', fontWeight: 700,
            background: 'var(--primary)', color: '#fff', padding: '2px 8px',
            borderRadius: '10px',
          }}>
            {invites.length}
          </span>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {invites.length === 0 ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', height: '60%', gap: '12px', padding: '24px',
          }}>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', textAlign: 'center', margin: 0 }}>
              No pending invites
            </p>
          </div>
        ) : (
          invites.map((invite) => (
            <div key={invite.id} style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '14px 16px', borderBottom: '0.5px solid var(--border)',
            }}>
              <div style={{
                width: '48px', height: '48px', borderRadius: '50%', background: 'var(--primary)',
                flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '20px', fontWeight: 500, color: '#fff',
              }}>
                {invite.fromName.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  margin: 0, fontSize: '15px', fontWeight: 500, color: 'var(--text-primary)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {invite.fromName}
                </p>
                <p style={{ margin: '2px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                  {invite.fromPhone ? maskPhone(invite.fromPhone) : 'Wants to chat with you'}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                <button onClick={() => handleDecline(invite.id!)} style={{
                  width: '36px', height: '36px', borderRadius: '50%', border: '0.5px solid var(--border)',
                  background: 'var(--surface-2)', cursor: 'pointer', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)',
                }}>
                  <X size={16} />
                </button>
                <button onClick={() => handleAccept(invite)} style={{
                  width: '36px', height: '36px', borderRadius: '50%', border: 'none',
                  background: '#25D366', cursor: 'pointer', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', color: '#fff',
                }}>
                  <Check size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function InvitesPage() {
  return (
    <AuthGuard>
      <InvitesContent />
    </AuthGuard>
  );
}
