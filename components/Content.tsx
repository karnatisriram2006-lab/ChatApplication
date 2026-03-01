import Image from "next/image";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy, limit, where } from "firebase/firestore";
import Chats from "./Chats";
import { useChatStore } from "@/store/useChatStore";
import GroupModal from "./GroupModal";
import { Plus } from "lucide-react";
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
    const [searchQuery, setSearchQuery] = useState("");
    const { selectedUser, setSelectedUser } = useChatStore();
    const { openGroupModal } = useModalStore();

    useEffect(() => {
        let q;
        if (searchQuery.trim() === "") {
            q = query(collection(db, "users"), orderBy("name", "asc"), limit(50));
        } else {
            // Search against nameLowercase for true case-insensitive prefix matching.
            // e.g. typing "ali" will find "Ali", "alice", "ALICE", etc.
            const queryLower = searchQuery.toLowerCase();
            q = query(collection(db, "users"), 
                where("nameLowercase", ">=", queryLower), 
                where("nameLowercase", "<=", queryLower + "\uf8ff"), 
                limit(50)
            );
        }
        
        const unsubscribeUsers = onSnapshot(q, (snapshot) => {
            const usersData: User[] = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                if (doc.id !== currentUser) {
                    usersData.push({
                        uid: doc.id,
                        name: data.name,
                        status: data.status,
                        avatar: data.avatar,
                        lastSeen: data.lastSeen
                    } as User);
                }
            });
            setUsers(usersData);
        });

        // Fetch Groups
        const groupQ = query(collection(db, "groups"), where("members", "array-contains", currentUser));
        const unsubscribeGroups = onSnapshot(groupQ, (snapshot) => {
            const groupsData: User[] = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                groupsData.push({
                    uid: doc.id,
                    name: data.name,
                    status: "Group",
                    avatar: data.avatar || "/team-fill.svg",
                    isGroup: true
                } as User);
            });
            setGroups(groupsData);
        });

        return () => {
            unsubscribeUsers();
            unsubscribeGroups();
        };
    }, [searchQuery, currentUser]);

    // Merge and filter groups in-memory (since we already have them all)
    const filteredGroups = groups.filter(g => 
        g.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Merge and sort: Groups and Users
    const allChats = [...filteredGroups, ...users];

    return (
        <aside className="h-full w-full bg-white dark:bg-gray-950 flex flex-col border-r border-gray-200/50 dark:border-white/5">
            {/* Sidebar header */}
            <div className="px-6 pt-8 pb-6 bg-white dark:bg-gray-950 sticky top-0 z-10 transition-all duration-300">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-black text-gray-900 dark:text-gray-100 tracking-tight flex items-center gap-2">
                        Messages
                        <span className="px-2 py-0.5 bg-blue-500/10 text-blue-600 text-[10px] font-black rounded-full uppercase tracking-widest">Beta</span>
                    </h2>
                    <button 
                        onClick={openGroupModal}
                        className="p-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-500/30 transition-all active:scale-95 group"
                        title="New Group"
                    >
                        <Plus size={18} strokeWidth={3} className="group-hover:rotate-90 transition-transform" />
                    </button>
                </div>
                <div className="group flex items-center gap-3 bg-gray-100/50 dark:bg-gray-900/40 h-10 w-full rounded-xl px-4 border border-transparent focus-within:border-blue-500/50 focus-within:bg-white dark:focus-within:bg-gray-950 focus-within:shadow-lg focus-within:shadow-blue-500/10 transition-all duration-300">
                    <Image src="/search-line.svg" alt="Search" width={16} height={16} className="opacity-30 group-focus-within:opacity-60 dark:invert transition-opacity" />
                    <input 
                        type="text" 
                        placeholder="Jump to chat..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-transparent border-none outline-none w-full text-[13px] text-gray-800 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-500 font-bold" 
                    />
                </div>
            </div>
            
            <div className="w-full flex-1 overflow-y-auto px-2 pb-6 space-y-0.5 custom-scrollbar scroll-shadow-top scroll-shadow-bottom">
                <div className="px-4 py-2">
                    <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-2">Direct Messages</p>
                </div>
                {allChats.map((chat) => (
                    <Chats 
                        key={chat.uid}
                        userId={chat.isGroup ? "" : chat.uid} // Presence only for individuals
                        name={chat.name}
                        status={chat.isGroup ? "Group" : chat.status}
                        time={chat.isGroup ? "" : ""} 
                        avatar={chat.avatar}
                        isActive={selectedUser === chat.uid}
                        onClick={() => setSelectedUser(chat.uid)}
                        lastMessage={""}
                        unreadCount={chat.uid === "dummy-unread" ? 3 : 0} 
                        lastSeen={chat.lastSeen}
                    />
                ))}
            </div>

        </aside>
    );
};

export default Content;