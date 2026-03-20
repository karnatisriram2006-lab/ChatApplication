"use client";
import Image from "next/image";
import { Check, CheckCheck } from "lucide-react";
import { Timestamp } from "firebase/firestore";

interface ChatsProps {
    userId: string;
    name: string;
    status: string;
    time: string;
    avatar: string;
    isActive: boolean;
    onClick: () => void;
    lastMessage?: string;
    unreadCount?: number;
    lastSeen: Timestamp | null;
}

const Chats = ({
    name,
    status,
    time = "12:00",
    avatar,
    isActive,
    onClick,
    lastMessage = "Hey, how are you?",
    unreadCount = 0,
    lastSeen
}: ChatsProps) => {
    
    // Status color mapping
    const getStatusColor = () => {
        switch (status?.toLowerCase()) {
            case "online": return "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]";
            case "away": return "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]";
            case "dnd": return "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]";
            default: return "bg-slate-400";
        }
    };

    const isOnline = status?.toLowerCase() === "online";

    return (
        <div
            onClick={onClick}
            className={`
                px-4 py-3 cursor-pointer transition-all duration-200 group relative
                hover:translate-x-1 border-y border-transparent
                ${isActive 
                    ? "bg-primary/8 dark:bg-primary/12 border-primary/10 dark:border-primary/20 shadow-inner-glow" 
                    : "hover:bg-surface-elevated/50"
                }
            `}
        >
            {/* Active Indicator Line */}
            {isActive && (
                <div className="absolute left-0 top-2 bottom-2 w-1 primary-gradient rounded-r-full animate-fadeIn" />
            )}

            <div className="flex items-center gap-3.5">
                {/* Avatar with Presence */}
                <div className="relative flex-shrink-0 group-hover:scale-105 transition-transform duration-300">
                    <div className={`
                        w-11 h-11 rounded-xl p-[1px]
                        ${isActive ? "primary-gradient shadow-glow" : "bg-border"}
                    `}>
                        <div className="w-full h-full rounded-[10px] bg-surface-2 overflow-hidden flex items-center justify-center">
                            {avatar ? (
                                <Image
                                    src={avatar}
                                    alt={name}
                                    width={44}
                                    height={44}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <span className="text-primary font-bold text-sm">{name.charAt(0).toUpperCase()}</span>
                            )}
                        </div>
                    </div>
                    
                    {/* Presence Indicator */}
                    <div className={`
                        absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-sidebar-surface 
                        ${getStatusColor()}
                        ${isOnline ? "animate-status-pulse" : ""}
                    `} title={status} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                        <h3 className={`text-[15px] font-bold truncate tracking-tight transition-colors ${isActive ? "text-primary" : "text-text-primary"}`}>
                            {name}
                        </h3>
                        <span className="text-[12px] text-text-muted font-medium ml-2 whitespace-nowrap">
                            {time}
                        </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                        <p className={`text-[12px] truncate leading-tight transition-colors ${isActive ? "text-text-primary/80" : "text-text-secondary"}`}>
                            {lastMessage}
                        </p>
                        
                        {unreadCount > 0 && (
                            <span className="min-w-[18px] h-[18px] px-1 rounded-full primary-gradient text-white text-[10px] font-black flex items-center justify-center shadow-glow animate-scaleIn ml-2">
                                {unreadCount}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Chats;
