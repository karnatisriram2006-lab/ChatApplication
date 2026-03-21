'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, orderBy, limit, Timestamp } from 'firebase/firestore';
import { useChatStore } from '@/store/useChatStore';
import { useContacts } from '@/hooks/useContacts';
import { usePushNotifications, type ToastNotification } from '@/hooks/usePushNotifications';
import Navbar from '@/components/Navbar';
import Messages from '@/components/Messages';
import BottomNav from '@/components/BottomNav';
import Chats from '@/components/Chats';
import AuthGuard from '@/components/AuthGuard';
import NotificationToast from '@/components/NotificationToast';
import NotificationPermissionBanner from '@/components/NotificationPermissionBanner';
import { Search, Plus } from 'lucide-react';
import Link from 'next/link';

function ContactsContent() {
  const [user, setUser] = useState<User | null>(null);
  const { selectedUser, setSelectedUser } = useChatStore();
  const contacts = useContacts(user?.uid ?? null);
  const { toasts: fcmToasts, permissionState, requestPermission, dismissToast: dismissFcmToast } = usePushNotifications(
    user?.uid ?? null,
    selectedUser
  );

  // In-app toast notifications for new messages
  const [localToasts, setLocalToasts] = useState<ToastNotification[]>([]);
  const prevIdsRef = useRef<Set<string>>(new Set());
  const isFirstSnapshotRef = useRef(true);

  const playNotificationSound = useCallback(() => {
    try {
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
      oscillator.frequency.setValueAtTime(660, audioCtx.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime + 0.2);
      gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.3);
    } catch { /* audio not supported */ }
  }, []);

  useEffect(() => {
    if (!user?.uid) return;

    prevIdsRef.current = new Set();
    isFirstSnapshotRef.current = true;

    const roomIds = contacts.map(c => c.roomId).filter(Boolean);
    if (roomIds.length === 0) return;

    // Firestore whereIn supports max 30 values
    const chunks: string[][] = [];
    for (let i = 0; i < roomIds.length; i += 30) {
      chunks.push(roomIds.slice(i, i + 30));
    }

    const unsubs: (() => void)[] = [];

    for (const chunk of chunks) {
      if (chunk.length === 0) continue;

      const q = query(
        collection(db, 'messages'),
        where('roomId', 'in', chunk),
        orderBy('createdAt', 'desc'),
        limit(30)
      );

      const unsub = onSnapshot(q, (snapshot) => {
        const currentIds = new Set<string>();

        for (const docSnap of snapshot.docs) {
          currentIds.add(docSnap.id);
        }

        // Skip first snapshot — just populate prevIdsRef
        if (isFirstSnapshotRef.current) {
          isFirstSnapshotRef.current = false;
          prevIdsRef.current = new Set([...prevIdsRef.current, ...currentIds]);
          return;
        }

        for (const docSnap of snapshot.docs) {
          const d = docSnap.data();

          if (!prevIdsRef.current.has(docSnap.id) && d.author !== user.uid) {
            if (d.roomId === selectedUser) continue;

            const toast: ToastNotification = {
              id: crypto.randomUUID(),
              title: 'New message',
              body: (d.text ?? '').slice(0, 100),
              roomId: d.roomId,
              author: d.author,
            };

            setLocalToasts((prev) => [...prev, toast]);
            playNotificationSound();
            setTimeout(() => {
              setLocalToasts((prev) => prev.filter((t) => t.id !== toast.id));
            }, 5000);
          }
        }
        prevIdsRef.current = new Set([...prevIdsRef.current, ...currentIds]);
      }, () => {});

      unsubs.push(unsub);
    }

    return () => unsubs.forEach((u) => u());
  }, [user?.uid, selectedUser]);

  const allToasts = [...fcmToasts, ...localToasts];
  const dismissAll = (id: string) => {
    dismissFcmToast(id);
    setLocalToasts((prev) => prev.filter((t) => t.id !== id));
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  if (!user) return null;

  return (
    <div className="fixed inset-0 overflow-hidden bg-background">
      <NotificationPermissionBanner permissionState={permissionState} onAllow={requestPermission} />
      <div className="aurora-bg" aria-hidden="true" />
      <Navbar />
      <main className="absolute top-[70px] bottom-16 md:bottom-0 left-0 right-0 flex overflow-hidden z-0">
        {/* Sidebar */}
        <div className={`
          w-full md:w-[320px] lg:w-[340px] flex-shrink-0
          border-r border-border transition-all duration-300
          ${selectedUser ? "hidden md:flex" : "flex animate-slideInLeft"}
        `}>
          <aside className="h-full w-full bg-sidebar-surface flex flex-col border-r border-border noise-panel relative z-20">
            <div className="px-5 pt-6 pb-4 border-b border-border/50">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[20px] font-bold text-text-primary tracking-tight">Chats</h2>
                <Link href="/search" className="w-8 h-8 flex items-center justify-center bg-primary hover:bg-primary-hover active:scale-90 text-white rounded-lg shadow-glow transition-all cursor-pointer">
                  <Plus size={16} strokeWidth={2.5} />
                </Link>
              </div>
              <Link href="/search" className="relative group/search flex items-center w-full pl-9 pr-4 py-2.5 bg-input-surface border border-border rounded-xl text-[14px] font-medium text-text-muted cursor-pointer transition-all hover:border-primary/40">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                Search by email...
              </Link>
            </div>
            <div className="flex-1 overflow-y-auto pt-2 pb-6 custom-scrollbar">
              {contacts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full px-6 text-center gap-4">
                  <p className="text-[14px] text-text-secondary leading-relaxed">
                    No chats yet.<br />Invite a friend to start chatting.
                  </p>
                  <Link href="/search" className="px-6 py-2.5 primary-gradient text-white font-bold text-[14px] rounded-xl shadow-glow transition-all active:scale-95">
                    New chat
                  </Link>
                </div>
              ) : (
                contacts.map((contact) => (
                  <Chats
                    key={contact.uid}
                    userId={contact.uid}
                    name={contact.displayName}
                    status=""
                    time=""
                    avatar={contact.photoURL || ""}
                    isActive={selectedUser === contact.uid}
                    onClick={() => setSelectedUser(contact.uid)}
                    lastMessage=""
                    unreadCount={0}
                    lastSeen={null}
                  />
                ))
              )}
            </div>
          </aside>
        </div>

        {/* Chat area */}
        <div className={`
          flex-1 bg-surface transition-all duration-300
          ${selectedUser ? "flex animate-slideIn" : "hidden md:flex"}
        `}>
          {selectedUser && user ? (
            <Messages currentUser={user.uid} />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-fadeIn">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-primary/15 blur-3xl rounded-full scale-150" />
                <div className="relative w-20 h-20 rounded-3xl glass border border-glass-border shadow-premium flex items-center justify-center">
                  <Image src="/chat-1-fill.svg" alt="" width={40} height={40} className="opacity-50" aria-hidden="true" />
                </div>
              </div>
              <h2 className="text-xl font-bold text-text-primary mb-2 tracking-tight">Your Messages</h2>
              <p className="text-sm text-text-secondary max-w-[240px] leading-relaxed">
                Select a conversation from the sidebar to start messaging.
              </p>
            </div>
          )}
        </div>
      </main>
      <NotificationToast toasts={allToasts} onDismiss={dismissAll} />
      <BottomNav />
    </div>
  );
}

export default function ContactsPage() {
  return (
    <AuthGuard>
      <ContactsContent />
    </AuthGuard>
  );
}
