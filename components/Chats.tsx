import Image from "next/image";
import { useEffect, useState } from "react";
import { rtdb } from "@/lib/firebase";
import { ref, onValue } from "firebase/database";

interface ChatsProps {
    userId: string;
    name: string;
    status: string;
    time: string;
    avatar: string;
    isActive: boolean;
    unreadCount?: number;
    onClick: () => void;
}

const Chats = ({ userId, name, status, time, avatar, isActive, unreadCount = 0, onClick }: ChatsProps) => {
    const [internalStatus, setInternalStatus] = useState(status);

    useEffect(() => {
        if (!userId) return;
        const presenceRef = ref(rtdb, `presence/${userId}`);
        const unsubscribe = onValue(presenceRef, (snapshot) => {
            const data = snapshot.val();
            if (data?.status) {
                setInternalStatus(data.status);
            }
        });
        return () => unsubscribe();
    }, [userId]);

    const displayStatus = internalStatus || status;
    return (
        <section
            onClick={onClick}
            className={`px-4 py-3 flex w-full items-center justify-between cursor-pointer transition-all duration-200 border-b border-gray-100/60 dark:border-gray-800/60 ${
                isActive
                    ? "bg-blue-50/50 dark:bg-blue-900/20 border-r-[3px] border-blue-500 shadow-sm"
                    : "hover:bg-gray-50 dark:hover:bg-gray-900/50"
            }`}
        >
            <div className="flex items-center gap-3">
                <div className="relative flex-shrink-0">
                    <div className={`rounded-full p-[2px] ${isActive ? "bg-gradient-to-tr from-blue-400 to-blue-500" : "bg-gray-200/60 dark:bg-gray-800"}`}>
                        <Image
                            src={avatar || "/user-fill.svg"}
                            alt={name}
                            width={40}
                            height={40}
                            className="rounded-full bg-white dark:bg-gray-900 object-cover"
                        />
                    </div>
                    {displayStatus === "Online" && (
                        <div className="absolute bottom-0.5 right-0.5 w-2.5 h-2.5 bg-emerald-400 border-2 border-white dark:border-gray-900 rounded-full shadow-sm" />
                    )}
                </div>
                <div className="flex flex-col min-w-0">
                    <p className={`font-semibold text-[13px] tracking-tight truncate ${isActive ? "text-blue-700 dark:text-blue-400" : "text-gray-800 dark:text-gray-200"}`}>{name}</p>
                    <p className={`text-[11px] leading-tight font-medium ${displayStatus === "Online" ? "text-emerald-500 dark:text-emerald-400" : "text-gray-400 dark:text-gray-500"}`}>
                        {displayStatus === "Online" ? "🟢 Online" : "⚫ Offline"}
                    </p>
                </div>
            </div>
            <div className="flex flex-col items-end gap-1 flex-shrink-0 ml-2">
                <p className={`text-[10px] ${unreadCount > 0 ? "text-blue-600 dark:text-blue-400 font-bold" : "text-gray-400 dark:text-gray-500"}`}>{time}</p>
                {unreadCount > 0 && (
                    <div className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center shadow">
                        {unreadCount > 99 ? "99+" : unreadCount}
                    </div>
                )}
            </div>
        </section>
    );
};

export default Chats;
