import { Timestamp } from 'firebase/firestore';

export interface UserProfile {
  uid: string;
  displayName: string;
  displayNameLower?: string;
  phone?: string;
  email?: string;
  photoURL?: string | null;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

export interface Contact {
  uid: string;
  displayName: string;
  phone?: string;
  photoURL?: string | null;
  roomId: string;
  addedAt: Timestamp;
}

export interface Message {
  id?: string;
  roomId: string;
  author: string;
  text: string;
  createdAt: Timestamp;
  editedAt?: Timestamp;
  deleted?: boolean;
  readBy?: string[];
}

export type ReceiptStatus = 'sent' | 'delivered' | 'read';

export interface ChatInvite {
  id?: string;
  from: string;
  fromName: string;
  fromPhone?: string | null;
  to: string;
  toName: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: Timestamp;
}

export interface Group {
  id?: string;
  name: string;
  members: string[];
  createdBy: string;
  createdAt: Timestamp;
  photoURL?: string;
}

export interface TypingStatus {
  uid: string;
  displayName: string;
  timestamp: Timestamp;
}

export type RoomId = string;
