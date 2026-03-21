import {
  doc, setDoc, getDoc, updateDoc, deleteDoc,
  collection, query, where, onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { logger } from '@/lib/logger';
import type { Contact, ChatInvite, UserProfile } from '@/types';

export function getRoomId(uid1: string, uid2: string): string {
  return [uid1, uid2].sort().join('_');
}

export function maskPhone(phone: string): string {
  if (!phone || phone.length < 6) return phone;
  return phone.slice(0, -3).replace(/\d(?=\d{2})/g, '*') + phone.slice(-3);
}

export async function sendInvite(
  sender: UserProfile,
  recipient: { uid: string; displayName: string; phone?: string }
): Promise<void> {
  // Check if already contacts
  const existing = await getDoc(
    doc(db, 'users', sender.uid, 'contacts', recipient.uid)
  );
  if (existing.exists()) {
    throw new Error('Already a contact');
  }

  const inviteId = [sender.uid, recipient.uid].sort().join('_');
  await setDoc(doc(db, 'chatInvites', inviteId), {
    from: sender.uid,
    fromName: sender.displayName,
    fromPhone: sender.phone ?? null,
    to: recipient.uid,
    toName: recipient.displayName,
    status: 'pending',
    createdAt: serverTimestamp(),
  });
}

export async function acceptInvite(
  invite: ChatInvite
): Promise<string> {
  const roomId = getRoomId(invite.from, invite.to);

  // Write contact to both users' subcollections
  await setDoc(doc(db, 'users', invite.from, 'contacts', invite.to), {
    uid: invite.to,
    displayName: invite.toName,
    roomId,
    addedAt: serverTimestamp(),
  });

  await setDoc(doc(db, 'users', invite.to, 'contacts', invite.from), {
    uid: invite.from,
    displayName: invite.fromName,
    phone: invite.fromPhone ?? null,
    roomId,
    addedAt: serverTimestamp(),
  });

  // Update invite status
  await updateDoc(doc(db, 'chatInvites', invite.id!), { status: 'accepted' });

  return roomId;
}

export async function declineInvite(inviteId: string): Promise<void> {
  await updateDoc(doc(db, 'chatInvites', inviteId), { status: 'declined' });
}

export async function cancelInvite(inviteId: string): Promise<void> {
  await deleteDoc(doc(db, 'chatInvites', inviteId));
}

export function subscribeToIncomingInvites(
  uid: string,
  onUpdate: (invites: ChatInvite[]) => void
): () => void {
  const q = query(
    collection(db, 'chatInvites'),
    where('to', '==', uid),
    where('status', '==', 'pending')
  );

  return onSnapshot(q, (snapshot) => {
    const invites: ChatInvite[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      invites.push({
        id: docSnap.id,
        from: data.from,
        fromName: data.fromName,
        fromPhone: data.fromPhone,
        to: data.to,
        toName: data.toName,
        status: data.status,
        createdAt: data.createdAt,
      });
    });
    onUpdate(invites);
  }, (error) => {
    logger.warn('Invites subscription error:', error);
    onUpdate([]);
  });
}

export function subscribeToContacts(
  uid: string,
  onUpdate: (contacts: Contact[]) => void
): () => void {
  const ref = collection(db, 'users', uid, 'contacts');

  return onSnapshot(ref, (snapshot) => {
    const contacts: Contact[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      contacts.push({
        uid: docSnap.id,
        displayName: data.displayName ?? 'User',
        phone: data.phone,
        photoURL: data.photoURL,
        roomId: data.roomId,
        addedAt: data.addedAt,
      });
    });
    onUpdate(contacts);
  }, (error) => {
    logger.warn('Contacts subscription error:', error);
    onUpdate([]);
  });
}
