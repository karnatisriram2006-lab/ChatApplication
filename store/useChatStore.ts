import { create } from 'zustand';

interface ChatState {
    selectedUser: string | null;
    setSelectedUser: (userId: string | null) => void;
}

export const useChatStore = create<ChatState>((set) => ({
    selectedUser: null,
    setSelectedUser: (userId) => set({ selectedUser: userId }),
}));
