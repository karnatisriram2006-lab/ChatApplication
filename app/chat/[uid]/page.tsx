'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useChatStore } from '@/store/useChatStore';
import Messages from '@/components/Messages';
import AuthGuard from '@/components/AuthGuard';

function ChatContent() {
  const params = useParams();
  const contactUid = params.uid as string;
  const { setSelectedUser } = useChatStore();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (contactUid) setSelectedUser(contactUid);
  }, [contactUid, setSelectedUser]);

  if (!user) return null;

  return (
    <div className="fixed inset-0 overflow-hidden bg-background">
      <div className="aurora-bg" aria-hidden="true" />
      <div className="w-full h-full">
        <Messages currentUser={user.uid} />
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <AuthGuard>
      <ChatContent />
    </AuthGuard>
  );
}
