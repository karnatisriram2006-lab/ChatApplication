"use client";
import { useState } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, where, Timestamp } from "firebase/firestore";
import { useEffect } from "react";
import Chats from "./Chats";
import { useChatStore } from "@/store/useChatStore";
import { useContacts } from "@/hooks/useContacts";
import { Plus, Search } from "lucide-react";
import { useModalStore } from "@/store/useModalStore";
import Link from "next/link";

interface ContentProps {
    currentUser: string;
}

interface ChatUser {
    uid: string;
    name: string;
    status: string;
    lastSeen: Timestamp | null;
    avatar: string;
    isGroup?: boolean;
}

const Content = ({ currentUser }: ContentProps) => {
    const contacts = useContacts(currentUser);
    const [groups, setGroups] = useState<ChatUser[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const { selectedUser, setSelectedUser } = useChatStore();
    const { openGroupModal } = useModalStore();

    useEffect(() => {
        const groupQ = query(collection(db, "groups"), where("members", "array-contains", currentUser));
        const unsubGroups = onSnapshot(groupQ, (snapshot) => {
            const groupsData: ChatUser[] = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                groupsData.push({
                    uid: doc.id,
                    name: data.name,
                    status: "Group",
                    avatar: data.avatar || "/team-fill.svg",
                    lastSeen: null,
                    isGroup: true,
                });
            });
            setGroups(groupsData);
        }, () => {});

        return () => { unsubGroups(); };
    }, [currentUser]);

    const filteredContacts = contacts.filter((c) =>
        c.displayName.toLowerCase().includes(searchQuery.toLowerCase())
    );
    const filteredGroups = groups.filter((g) =>
        g.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <aside className="h-full w-full bg-sidebar-surface flex flex-col border-r border-border shadow-[1px_0_10px_rgba(0,0,0,0.03)] dark:shadow-[1px_0_15px_rgba(0,0,0,0.2)] noise-panel relative z-20">
            <div className="absolute right-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-primary/5 to-transparent pointer-events-none" />

            <div className="px-5 pt-6 pb-4 border-b border-border/50">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-[20px] font-bold text-text-primary tracking-tight">Chats</h2>
                    <button
                        onClick={openGroupModal}
                        title="Create Group"
                        className="w-8 h-8 flex items-center justify-center bg-primary hover:bg-primary-hover active:scale-90 text-white rounded-lg shadow-glow transition-all cursor-pointer group focus-ring"
                    >
                        <Plus size={16} strokeWidth={2.5} className="group-hover:rotate-90 transition-transform" />
                    </button>
                </div>

                <Link href="/search" className="relative group/search flex items-center w-full pl-9 pr-4 py-2.5 bg-input-surface border border-border rounded-xl text-[14px] font-medium text-text-muted cursor-pointer transition-all hover:border-primary/40">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                    Invite a friend...
                </Link>
            </div>

            <div className="flex-1 overflow-y-auto pt-2 pb-6 custom-scrollbar">
                {contacts.length === 0 && groups.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full px-6 text-center gap-4">
                        <p className="text-[14px] text-text-secondary leading-relaxed">
                            No chats yet.<br />Invite a friend to start chatting.
                        </p>
                        <Link href="/search" className="px-6 py-2.5 primary-gradient text-white font-bold text-[14px] rounded-xl shadow-glow transition-all active:scale-95">
                            New chat
                        </Link>
                    </div>
                ) : (
                    <>
                        {filteredGroups.length > 0 && (
                            <div className="px-5 py-2 mt-2">
                                <p className="text-[12px] font-bold text-text-muted uppercase tracking-[0.1em]">Groups</p>
                            </div>
                        )}
                        {filteredGroups.map((chat) => (
                            <Chats
                                key={chat.uid}
                                userId=""
                                name={chat.name}
                                status="Group"
                                time=""
                                avatar={chat.avatar}
                                isActive={selectedUser === chat.uid}
                                onClick={() => setSelectedUser(chat.uid)}
                                lastMessage=""
                                unreadCount={0}
                                lastSeen={null}
                            />
                        ))}

                        {filteredContacts.length > 0 && (
                            <div className="px-5 py-2 mt-4">
                                <p className="text-[12px] font-bold text-text-muted uppercase tracking-[0.1em]">Chats</p>
                            </div>
                        )}
                        {filteredContacts.map((contact) => (
                            <Chats
                                key={contact.uid}
                                userId={contact.uid}
                                name={contact.displayName}
                                status=""
                                time=""
                                avatar={contact.photoURL || ""}
                                isActive={selectedUser === contact.uid}
                                onClick={() => setSelectedUser(contact.uid)}
                                lastMessage=""
                                unreadCount={0}
                                lastSeen={null}
                            />
                        ))}
                    </>
                )}
            </div>
        </aside>
    );
};

export default Content;
