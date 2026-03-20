import { Timestamp } from 'firebase/firestore';

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
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

export interface ChatRequest {
  id?: string;
  from: string;
  to: string;
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
