import { create } from 'zustand';

interface ModalState {
    isProfileModalOpen: boolean;
    isGroupModalOpen: boolean;
    openProfileModal: () => void;
    closeProfileModal: () => void;
    openGroupModal: () => void;
    closeGroupModal: () => void;
}

export const useModalStore = create<ModalState>((set) => ({
    isProfileModalOpen: false,
    isGroupModalOpen: false,
    openProfileModal: () => set({ isProfileModalOpen: true }),
    closeProfileModal: () => set({ isProfileModalOpen: false }),
    openGroupModal: () => set({ isGroupModalOpen: true }),
    closeGroupModal: () => set({ isGroupModalOpen: false }),
}));
