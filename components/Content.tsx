"use client";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy, limit, where } from "firebase/firestore";
import Chats from "./Chats";
import { useChatStore } from "@/store/useChatStore";
import { Plus, Search } from "lucide-react";
import { useModalStore } from "@/store/useModalStore";

interface ContentProps {
    currentUser: string;
}

interface User {
    uid: string;
    name: string;
    status: string;
    lastSeen: any;
    avatar: string;
    isGroup?: boolean;
}

const Content = ({ currentUser }: ContentProps) => {
    const [users, setUsers] = useState<User[]>([]);
    const [groups, setGroups] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const { selectedUser, setSelectedUser } = useChatStore();
    const { openGroupModal } = useModalStore();

    useEffect(() => {
        let q;
        if (searchQuery.trim() === "") {
            q = query(collection(db, "users"), orderBy("name", "asc"), limit(50));
        } else {
            const queryLower = searchQuery.toLowerCase();
            q = query(
                collection(db, "users"),
                where("nameLowercase", ">=", queryLower),
                where("nameLowercase", "<=", queryLower + "\uf8ff"),
                limit(50)
            );
        }

        const unsubUsers = onSnapshot(q, (snapshot) => {
            const usersData: User[] = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                if (doc.id !== currentUser) {
                    usersData.push({
                        uid: doc.id,
                        name: data.name,
                        status: data.status,
                        avatar: data.avatar,
                        lastSeen: data.lastSeen,
                    } as User);
                }
            });
            setUsers(usersData);
            setLoading(false);
        });

        const groupQ = query(collection(db, "groups"), where("members", "array-contains", currentUser));
        const unsubGroups = onSnapshot(groupQ, (snapshot) => {
            const groupsData: User[] = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                groupsData.push({
                    uid: doc.id,
                    name: data.name,
                    status: "Group",
                    avatar: data.avatar || "/team-fill.svg",
                    isGroup: true,
                } as User);
            });
            setGroups(groupsData);
        });

        return () => { unsubUsers(); unsubGroups(); };
    }, [searchQuery, currentUser]);

    const filteredGroups = groups.filter((g) =>
        g.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    const allChats = [...filteredGroups, ...users];

    return (
        <aside className="h-full w-full bg-sidebar-surface flex flex-col border-r border-border shadow-[1px_0_10px_rgba(0,0,0,0.03)] dark:shadow-[1px_0_15px_rgba(0,0,0,0.2)] noise-panel relative z-20">
            {/* Inner Glow Divider */}
            <div className="absolute right-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-primary/5 to-transparent pointer-events-none" />

            {/* Header */}
            <div className="px-5 pt-6 pb-4 border-b border-border/50">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-[20px] font-bold text-text-primary tracking-tight">Messages</h2>
                    <button
                        onClick={openGroupModal}
                        title="Create Group"
                        className="w-8 h-8 flex items-center justify-center bg-primary hover:bg-primary-hover active:scale-90 text-white rounded-lg shadow-glow transition-all cursor-pointer group focus-ring"
                    >
                        <Plus size={16} strokeWidth={2.5} className="group-hover:rotate-90 transition-transform" />
                    </button>
                </div>

                {/* Search */}
                <div className="relative group/search">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted group-focus-within/search:text-primary transition-colors" />
                    <input
                        type="text"
                        placeholder="Search conversations..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 bg-input-surface border border-border rounded-xl text-[14px] font-medium text-text-primary placeholder:text-text-muted focus:border-primary/40 focus:ring-4 focus:ring-primary/5 outline-none transition-all shadow-sm"
                    />
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto pt-2 pb-6 custom-scrollbar">
                {loading ? (
                    <div className="space-y-4 px-5 pt-4">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="flex items-center gap-3 animate-pulse">
                                <div className="w-11 h-11 rounded-xl bg-text-muted/10 flex-shrink-0" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-3 w-1/2 bg-text-muted/10 rounded" />
                                    <div className="h-2 w-3/4 bg-text-muted/5 rounded" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : allChats.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-center px-8 opacity-40">
                        <p className="text-[14px] font-medium text-text-muted">No conversations yet</p>
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

                        {users.length > 0 && (
                            <div className="px-5 py-2 mt-4">
                                <p className="text-[12px] font-bold text-text-muted uppercase tracking-[0.1em]">People</p>
                            </div>
                        )}
                        {users.map((chat) => (
                            <Chats
                                key={chat.uid}
                                userId={chat.uid}
                                name={chat.name}
                                status={chat.status}
                                time=""
                                avatar={chat.avatar}
                                isActive={selectedUser === chat.uid}
                                onClick={() => setSelectedUser(chat.uid)}
                                lastMessage=""
                                unreadCount={0}
                                lastSeen={chat.lastSeen}
                            />
                        ))}
                    </>
                )}
            </div>
        </aside>
    );
};

export default Content;