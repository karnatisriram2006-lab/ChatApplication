"use client";

import Image from "next/image";
import { useState } from "react";
import Navbar from "@/components/Navbar";
import Content from "@/components/Content";
import Messages from "@/components/Messages";
import { useAuth } from "@/context/AuthContext";
import { useChatStore } from "@/store/useChatStore";
import { useModalStore } from "@/store/useModalStore";
import ProfileModal from "@/components/ProfileModal";
import GroupModal from "@/components/GroupModal";
import BottomNav from "@/components/BottomNav";

export default function Home() {
    const { user, loading, loginWithGoogle } = useAuth();
    const { selectedUser, setSelectedUser } = useChatStore();
    const { isProfileModalOpen, isGroupModalOpen, closeProfileModal, closeGroupModal } = useModalStore();

    if (loading) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-primary to-secondary animate-pulse shadow-primary-glow" />
                    <div className="w-24 h-1.5 rounded-full skeleton" />
                </div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="relative h-[100dvh] flex items-center justify-center overflow-hidden bg-background">
                {/* Aurora bg */}
                <div className="aurora-bg" aria-hidden="true" />

                {/* Background image */}
                <Image
                    alt=""
                    src="/backgroundimage.jpg"
                    fill
                    style={{ objectFit: "cover", zIndex: -2, opacity: 0.04 }}
                    priority
                />

                {/* Login card */}
                <div className="relative z-10 w-full max-w-sm mx-4">
                    <div className="glass rounded-3xl p-8 shadow-premium border border-glass-border noise-panel flex flex-col items-center gap-7">
                        {/* Logo */}
                        <div className="flex flex-col items-center gap-3">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-primary to-secondary flex items-center justify-center shadow-primary-glow">
                                <span className="text-white font-black text-2xl select-none">C</span>
                            </div>
                            <div className="text-center">
                                <h1 className="text-2xl font-bold text-text-primary tracking-tight">
                                    Welcome to <span className="gradient-text">ChatApp</span>
                                </h1>
                                <p className="text-sm text-text-secondary mt-1">
                                    Sign in to start chatting securely
                                </p>
                            </div>
                        </div>

                        {/* Sign in button */}
                        <button
                            onClick={loginWithGoogle}
                            className="w-full flex items-center justify-center gap-3 py-3.5 px-6 bg-surface hover:bg-surface-2 border border-border rounded-xl font-semibold text-[15px] text-text-primary transition-all shadow-sm hover:shadow-md active:scale-[0.98] focus-ring cursor-pointer"
                        >
                            <Image src="/google-fill.svg" alt="Google" width={20} height={20} />
                            Continue with Google
                        </button>

                        {/* Footer note */}
                        <p className="text-[11px] text-text-muted text-center leading-relaxed">
                            By continuing, you agree to our terms of service.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 overflow-hidden bg-background">
            {/* Aurora bg — dark mode */}
            <div className="aurora-bg" aria-hidden="true" />

            <Navbar />

            <main className="absolute top-[70px] bottom-16 md:bottom-0 left-0 right-0 flex overflow-hidden z-0">
                {/* Sidebar */}
                <div className={`
                    w-full md:w-[320px] lg:w-[340px] flex-shrink-0
                    border-r border-border transition-all duration-300
                    ${selectedUser ? "hidden md:flex" : "flex animate-slideInLeft"}
                `}>
                    <Content currentUser={user.uid} />
                </div>

                {/* Chat area */}
                <div className={`
                    flex-1 bg-surface transition-all duration-300
                    ${selectedUser ? "flex animate-slideIn" : "hidden md:flex"}
                `}>
                    {selectedUser ? (
                        <Messages currentUser={user.uid} />
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-fadeIn">
                            <div className="relative mb-6">
                                <div className="absolute inset-0 bg-primary/15 blur-3xl rounded-full scale-150" />
                                <div className="relative w-20 h-20 rounded-3xl glass border border-glass-border shadow-premium flex items-center justify-center">
                                    <Image
                                        src="/message-2-fill.svg"
                                        alt=""
                                        width={40}
                                        height={40}
                                        className="opacity-50"
                                        aria-hidden="true"
                                    />
                                </div>
                            </div>
                            <h2 className="text-xl font-bold text-text-primary mb-2 tracking-tight">
                                Your Messages
                            </h2>
                            <p className="text-sm text-text-secondary max-w-[240px] leading-relaxed">
                                Select a conversation from the sidebar to start messaging.
                            </p>
                            <div className="mt-6">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface-2 border border-border rounded-full text-[11px] font-semibold text-text-muted">
                                    <span className="w-1.5 h-1.5 rounded-full bg-success" />
                                    End-to-end encrypted
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {isProfileModalOpen && user && (
                <ProfileModal user={user} onClose={closeProfileModal} />
            )}

            {isGroupModalOpen && user && (
                <GroupModal currentUser={user.uid} onClose={closeGroupModal} />
            )}

            <BottomNav />
        </div>
    );
}
