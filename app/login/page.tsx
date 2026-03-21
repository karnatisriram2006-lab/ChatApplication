'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, signInWithPopup, updateProfile } from 'firebase/auth';
import { doc, setDoc, getDoc, getDocs, updateDoc, collection, query, where, serverTimestamp, addDoc } from 'firebase/firestore';
import { auth, googleProvider, db } from '@/lib/firebase';
import { getRoomId } from '@/lib/invites';
import { logger } from '@/lib/logger';
import Image from 'next/image';

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const profileSnap = await getDoc(doc(db, 'users', user.uid));
        if (profileSnap.exists()) {
          router.replace('/contacts');
        }
      }
    });
    return () => unsub();
  }, [router]);

  const handleGoogleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      const profileSnap = await getDoc(doc(db, 'users', user.uid));
      if (!profileSnap.exists()) {
        await updateProfile(user, { displayName: user.displayName || 'User' });
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          displayName: user.displayName || 'User',
          displayNameLower: (user.displayName || 'user').toLowerCase(),
          phone: user.phoneNumber || null,
          email: user.email || null,
          photoURL: user.photoURL || null,
          createdAt: serverTimestamp(),
        });
      }

      // Always check for pending email invites (handles both new and existing users)
      if (user.email) {
        try {
          const invitesQ = query(
            collection(db, 'emailInvites'),
            where('email', '==', user.email.toLowerCase()),
            where('status', '==', 'pending')
          );
          const inviteSnap = await getDocs(invitesQ);
          for (const inviteDoc of inviteSnap.docs) {
            const invite = inviteDoc.data();
            const roomId = getRoomId(invite.senderUid, user.uid);

            // Skip if already contacts
            const existing = await getDoc(doc(db, 'users', user.uid, 'contacts', invite.senderUid));
            if (existing.exists()) {
              await updateDoc(doc(db, 'emailInvites', inviteDoc.id), { status: 'accepted' });
              continue;
            }

            // Add contact to both users
            await setDoc(doc(db, 'users', invite.senderUid, 'contacts', user.uid), {
              uid: user.uid,
              displayName: user.displayName || 'User',
              phone: user.phoneNumber || null,
              roomId,
              addedAt: serverTimestamp(),
            });
            await setDoc(doc(db, 'users', user.uid, 'contacts', invite.senderUid), {
              uid: invite.senderUid,
              displayName: invite.senderName,
              phone: invite.senderPhone || null,
              roomId,
              addedAt: serverTimestamp(),
            });

            await updateDoc(doc(db, 'emailInvites', inviteDoc.id), { status: 'accepted' });
          }
        } catch (e) {
          logger.warn('Failed to process email invites:', e);
        }
      }

      router.replace('/contacts');
    } catch (error) {
      logger.error('Login failed:', error);
    }
  };

  return (
    <div className="relative h-[100dvh] flex items-center justify-center overflow-hidden bg-background">
      <div className="aurora-bg" aria-hidden="true" />
      <Image alt="" src="/backgroundimage.jpg" fill style={{ objectFit: 'cover', zIndex: -2, opacity: 0.04 }} priority />

      <div className="relative z-10 w-full max-w-sm mx-4">
        <div className="glass rounded-3xl p-8 shadow-premium border border-glass-border noise-panel flex flex-col items-center gap-7">
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-primary to-secondary flex items-center justify-center shadow-primary-glow">
              <span className="text-white font-black text-2xl select-none">C</span>
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-bold text-text-primary tracking-tight">
                Welcome to <span className="text-primary">ChatApp</span>
              </h1>
              <p className="text-sm text-text-secondary mt-1">Sign in to start chatting securely</p>
            </div>
          </div>

          <button
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center gap-3 py-3.5 px-6 bg-surface hover:bg-surface-2 border border-border rounded-xl font-semibold text-[15px] text-text-primary transition-all shadow-sm hover:shadow-md active:scale-[0.98] focus-ring cursor-pointer"
          >
            <Image src="/google-fill.svg" alt="Google" width={20} height={20} />
            Continue with Google
          </button>

          <p className="text-[11px] text-text-muted text-center leading-relaxed">
            By continuing, you agree to our terms of service.
          </p>
        </div>
      </div>
    </div>
  );
}
