import Image from "next/image";
import { useEffect, useState } from "react";
import { ref, onValue } from "firebase/database";
import { rtdb } from "@/lib/firebase";

interface ChatsProps {
    userId: string;
    name: string;
    status: string;
    time: string;
    avatar: string;
    isActive?: boolean;
    onClick: () => void;
    lastMessage?: string;
    unreadCount?: number;
    lastSeen?: any;
}

const Chats = ({ userId, name, status, time, avatar, isActive, onClick, lastMessage, unreadCount = 0, lastSeen }: ChatsProps) => {
    const [isOnline, setIsOnline] = useState(false);
    const [liveLastSeen, setLiveLastSeen] = useState<any>(null);

    useEffect(() => {
        if (!userId) return;
        const statusRef = ref(rtdb, `presence/${userId}`);
        const unsubscribe = onValue(statusRef, (snapshot) => {
            const data = snapshot.val();
            setIsOnline(data?.status === "Online");
            if (data?.lastSeen) {
                setLiveLastSeen(data.lastSeen);
            }
        });
        return () => unsubscribe();
    }, [userId]);

    const formatLastSeen = (ls: any) => {
        if (!ls) return "Offline";
        const date = typeof ls === 'number' ? new Date(ls) : (ls.toDate ? ls.toDate() : new Date());
        return `Last seen ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    };

    return (
        <div 
            onClick={onClick}
            className={`
                relative px-5 py-3.5 cursor-pointer transition-all duration-200 group
                flex items-center gap-4 border-l-[3.5px]
                ${isActive 
                    ? "bg-blue-50/60 dark:bg-blue-500/10 border-blue-600 dark:border-blue-500 shadow-sm" 
                    : "bg-transparent border-transparent hover:bg-gray-50/80 dark:hover:bg-gray-800/40 hover:translate-x-1"
                }
            `}
        >
            <div className="relative flex-shrink-0">
                <div className={`
                    w-12 h-12 rounded-2xl overflow-hidden shadow-md transition-transform duration-300 group-hover:scale-105
                    ${isActive ? "ring-2 ring-blue-500/20 ring-offset-2 dark:ring-offset-gray-950" : "border border-gray-100 dark:border-white/5"}
                `}>
                    <Image 
                        src={avatar || "/user-fill.svg"} 
                        alt={name} 
                        width={48} 
                        height={48} 
                        className="w-full h-full object-cover"
                    />
                </div>
                {userId && (
                    <span className={`
                        absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-gray-950 transition-colors
                        ${isOnline ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-gray-300 dark:bg-gray-600"}
                    `} />
                )}
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-0.5">
                    <h3 className={`text-[14px] font-black truncate transition-colors tracking-tight ${isActive ? "text-blue-600 dark:text-blue-400" : "text-gray-900 dark:text-gray-100"}`}>
                        {name}
                    </h3>
                    <span className={`text-[9px] font-black uppercase tracking-widest shrink-0 ml-2 ${unreadCount > 0 ? "text-blue-600 dark:text-blue-400" : "text-gray-400 dark:text-gray-500"}`}>
                        {time}
                    </span>
                </div>
                
                <div className="flex items-center gap-2">
                    <p className={`text-[12px] truncate flex-1 font-medium leading-tight ${unreadCount > 0 ? "text-gray-900 dark:text-gray-100 font-bold" : "text-gray-500 dark:text-gray-400"}`}>
                        {lastMessage || (status === "Group" ? "No messages yet" : (isOnline ? "Active now" : formatLastSeen(liveLastSeen || lastSeen)))}
                    </p>
                    {unreadCount > 0 && (
                        <span className="px-1.5 py-0.5 min-w-[20px] h-[18px] bg-blue-600 text-white text-[10px] font-black rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/30 animate-scaleIn">
                            {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Chats;
