import Image from "next/image";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import Chats from "./Chats";

interface ContentProps {
    onSelectUser: (name: string) => void;
    selectedUser: string | null;
    currentUser: string;
}

interface User {
    uid: string;
    name: string;
    status: string;
    lastSeen: any;
    avatar: string;
}

const Content = ({ onSelectUser, selectedUser, currentUser }: ContentProps) => {
    const [users, setUsers] = useState<User[]>([]);

    useEffect(() => {
        const q = query(collection(db, "users"), orderBy("name", "asc"));
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const usersData: User[] = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                usersData.push({
                    uid: doc.id,
                    name: data.name,
                    status: data.status,
                    avatar: data.avatar,
                    lastSeen: data.lastSeen
                } as any);
            });
            setUsers(usersData);
        });

        return () => unsubscribe();
    }, []);

    return (
        <aside className="h-full w-full bg-white flex flex-col items-center py-4">
            <div className="flex items-center justify-between bg-gray-100/50 h-12 w-[90%] rounded-2xl px-4 mb-4 border border-gray-100">
                <Image src="/search-line.svg" alt="Search" width={20} height={20} className="opacity-40" />
                <input type="text" placeholder="Search" className="px-2 bg-transparent border-none rounded-lg outline-none w-full text-sm" />
            </div>
            
            <div className="w-full flex-1 overflow-y-auto">
                {users
                    .filter(u => u.uid !== currentUser)
                    .map((user) => (
                    <Chats 
                        key={user.uid}
                        name={user.name}
                        status={user.status}
                        time="Active"
                        avatar={user.avatar}
                        isActive={selectedUser === user.uid}
                        onClick={() => onSelectUser(user.uid)}
                    />
                ))}
            </div>
        </aside>
    )
}

export default Content;