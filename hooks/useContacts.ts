'use client';

import { useState, useEffect } from 'react';
import { subscribeToContacts } from '@/lib/invites';
import type { Contact } from '@/types';

export function useContacts(uid: string | null): Contact[] {
  const [contacts, setContacts] = useState<Contact[]>([]);

  useEffect(() => {
    if (!uid) return;
    const unsubscribe = subscribeToContacts(uid, setContacts);
    return () => unsubscribe();
  }, [uid]);

  return contacts;
}
