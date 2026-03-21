import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('00')) return '+' + digits.slice(2);
  if (digits.startsWith('0')) return '+' + digits;
  if (!phone.startsWith('+')) return '+' + digits;
  return phone.replace(/\s+/g, '');
}

async function hashPhone(phone: string): Promise<string> {
  const normalized = normalizePhone(phone);
  const encoder = new TextEncoder();
  const data = encoder.encode(normalized);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function registerPhoneIndex(
  phone: string,
  uid: string,
  displayName: string
): Promise<void> {
  const hash = await hashPhone(phone);
  await setDoc(doc(db, 'phoneIndex', hash), {
    uid,
    displayName,
    registeredAt: new Date(),
  });
}

export async function lookupByPhone(
  phone: string
): Promise<{ uid: string; displayName: string } | null> {
  const hash = await hashPhone(phone);
  const snap = await getDoc(doc(db, 'phoneIndex', hash));
  if (!snap.exists()) return null;
  const data = snap.data();
  return { uid: data.uid, displayName: data.displayName };
}
