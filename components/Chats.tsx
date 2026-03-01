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
    const [isOnline, setIsOnline] = useState(status === "Online");
    const [liveLastSeen, setLiveLastSeen] = useState<any>(null);

    useEffect(() => {
        if (!userId) {
            setIsOnline(false); // Groups don't have individual presence
            return;
        }
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

    // Helper to get initials
    const getInitials = (n: string) => {
        return n ? n.charAt(0).toUpperCase() : "?";
    };

    return (
        <div 
            onClick={onClick}
            className={`
                relative px-5 py-4 cursor-pointer transition-all duration-200 group
                flex items-center gap-4 border-l-4
                ${isActive 
                    ? "bg-primary/10 border-l-primary shadow-sm shadow-primary/5" 
                    : "bg-transparent border-l-transparent hover:bg-white/[0.02] hover:translate-x-1"
                }
            `}
        >
            <div className="relative flex-shrink-0">
                <div className={`
                    w-12 h-12 rounded-2xl overflow-hidden shadow-md transition-transform duration-300 group-hover:scale-105
                    ${isActive ? "ring-2 ring-primary/20 ring-offset-2 dark:ring-offset-background" : "border border-border"}
                    flex items-center justify-center
                    ${(!avatar || avatar === "") ? "bg-gradient-to-tr from-primary/20 to-accent/20 border border-primary/20" : "bg-sidebar-surface"}
                `}>
                    {avatar ? (
                        <Image 
                            src={avatar} 
                            alt={name} 
                            width={48} 
                            height={48} 
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <span className="text-primary font-black text-xl tracking-tighter drop-shadow-sm select-none">
                            {getInitials(name)}
                        </span>
                    )}
                </div>
                {userId && (
                    <span className={`
                        absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-background transition-colors
                        ${isOnline ? "bg-accent animate-pulse-cyan shadow-[0_0_12px_rgba(34,211,238,0.6)]" : "bg-text-muted/40"}
                    `} />
                )}
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-1">
                    <h3 className={`text-[15px] font-bold tracking-tight truncate transition-colors ${isActive ? 'text-primary' : 'text-text-primary'}`}>
                        {name}
                    </h3>
                    <span className="text-[10px] font-medium text-text-muted opacity-80">
                        {time}
                    </span>
                </div>
                
                <div className="flex items-center justify-between gap-2">
                    <p className={`text-xs truncate flex-1 font-medium leading-tight ${unreadCount > 0 ? "text-text-primary font-bold" : "text-text-secondary"}`}>
                        {lastMessage || (status === "Group" ? "No messages yet" : "")}
                    </p>
                    {unreadCount > 0 && (
                        <span className="px-1.5 py-0.5 min-w-[18px] h-[18px] bg-primary text-white text-[10px] font-black rounded-lg flex items-center justify-center shadow-lg shadow-primary/30 animate-scaleIn">
                            {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Chats;
