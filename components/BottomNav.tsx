"use client";

import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { useChatStore } from "@/store/useChatStore";

const BottomNav = () => {
    const { logout } = useAuth();
    const { selectedUser, setSelectedUser } = useChatStore();

    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-sidebar-surface/80 backdrop-blur-2xl border-t border-border z-[100] flex items-center justify-around px-2 pb-safe-bottom">
            <Link
                href="/contacts"
                onClick={() => setSelectedUser(null)}
                className={`flex flex-col items-center justify-center touch-target transition-all ${!selectedUser ? "text-primary scale-110" : "text-text-muted opacity-50"}`}
            >
                <Image
                    src="/chat-1-fill.svg"
                    alt="Chats"
                    width={20}
                    height={20}
                    className={`dark:invert ${!selectedUser ? "opacity-100" : "opacity-40"}`}
                />
                <span className="text-[10px] font-bold mt-1">Chats</span>
            </Link>

            <Link
                href="/invites"
                className="flex flex-col items-center justify-center touch-target text-text-muted opacity-60"
            >
                <Image src="/team-fill.svg" alt="Invites" width={20} height={20} className="dark:invert" />
                <span className="text-[10px] font-bold mt-1">Invites</span>
            </Link>

            <button
                onClick={logout}
                className="flex flex-col items-center justify-center touch-target text-error opacity-60"
            >
                <Image src="/logout-box-line.svg" alt="Logout" width={20} height={20} className="dark:invert" />
                <span className="text-[10px] font-bold mt-1">Logout</span>
            </button>
        </nav>
    );
};

export default BottomNav;
