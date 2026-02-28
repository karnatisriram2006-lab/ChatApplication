import Image from "next/image";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy, limit, where } from "firebase/firestore";
import Chats from "./Chats";
import { useChatStore } from "@/store/useChatStore";

interface ContentProps {
    currentUser: string;
}

interface User {
    uid: string;
    name: string;
    status: string;
    lastSeen: any;
    avatar: string;
}

const Content = ({ currentUser }: ContentProps) => {
    const [users, setUsers] = useState<User[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const { selectedUser, setSelectedUser } = useChatStore();

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
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
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

        return () => unsubscribe();
    }, [searchQuery, currentUser]);

    return (
        <aside className="h-full w-full bg-white dark:bg-gray-950 flex flex-col">
            {/* Sidebar header */}
            <div className="px-4 py-4 border-b border-gray-100 dark:border-gray-800">
                <h2 className="text-base font-bold text-gray-800 dark:text-gray-100 mb-3 tracking-tight">Conversations</h2>
                <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900/80 h-10 w-full rounded-xl px-3 border border-gray-200/60 dark:border-gray-800/80 shadow-sm">
                    <Image src="/search-line.svg" alt="Search" width={16} height={16} className="opacity-40 flex-shrink-0 dark:invert" />
                    <input 
                        type="text" 
                        placeholder="Search contacts..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-transparent border-none outline-none w-full text-sm text-gray-700 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-500 font-medium" 
                    />
                </div>
            </div>
            
            <div className="w-full flex-1 overflow-y-auto">
                {users.map((user) => (
                    <Chats 
                        key={user.uid}
                        userId={user.uid}
                        name={user.name}
                        status={user.status}
                        time="Active"
                        avatar={user.avatar}
                        isActive={selectedUser === user.uid}
                        onClick={() => setSelectedUser(user.uid)}
                    />
                ))}
            </div>
        </aside>
    );
};

export default Content;