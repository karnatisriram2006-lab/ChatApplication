"use client";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { useState, useEffect, useRef } from "react";
import { useModalStore } from "@/store/useModalStore";
import { Sun, Moon, Users, MessageSquare, LogOut, Bell, Check, X } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, updateDoc, doc, getDoc } from "firebase/firestore";

const Navbar = () => {
    const { user, logout } = useAuth();
    const [isDarkMode, setIsDarkMode] = useState(false);
    const { openProfileModal } = useModalStore();
    const [notifications, setNotifications] = useState<any[]>([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setIsDarkMode(document.documentElement.classList.contains("dark"));
        
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowNotifications(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    useEffect(() => {
        if (!user?.uid) return;
        const q = query(
            collection(db, "chatRequests"),
            where("to", "==", user.uid)
        );
        
        const unsubscribe = onSnapshot(q, async (snap) => {
            const pendingDocs = snap.docs.filter((d) => d.data().status === "pending");
            const reqs = await Promise.all(pendingDocs.map(async (d) => {
                const data = d.data();
                const senderSnap = await getDoc(doc(db, "users", data.from));
                return { id: d.id, ...data, senderData: senderSnap.exists() ? senderSnap.data() : null };
            }));
            setNotifications(reqs);
        });

        return () => unsubscribe();
    }, [user]);

    const handleRequestAction = async (requestId: string, newStatus: "accepted" | "declined") => {
        try {
            await updateDoc(doc(db, "chatRequests", requestId), { status: newStatus });
            // Let the onSnapshot handle removing it locally
        } catch (e) {
            console.error(e);
        }
    };

    const toggleDarkMode = () => {
        const next = !isDarkMode;
        document.documentElement.classList.toggle("dark", next);
        setIsDarkMode(next);
        localStorage.setItem("theme", next ? "dark" : "light");
    };

    return (
        <header className="floating-header px-4 h-[58px] flex items-center justify-between noise-panel border-glass-border relative z-[1000]">
            {/* Brand */}
            <div className="flex items-center gap-3 group cursor-pointer ml-1">
                <div className="w-8 h-8 primary-gradient rounded-xl flex items-center justify-center shadow-glow group-hover:scale-110 transition-transform flex-shrink-0">
                    <span className="text-white font-black text-[15px] leading-none select-none">C</span>
                </div>
                <h1 className="text-[20px] font-bold tracking-tight text-text-primary">
                    Chat<span className="text-primary">App</span>
                </h1>
            </div>

            {/* Nav actions */}
            <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-surface-2/40 rounded-full border border-border p-1 backdrop-blur-md transition-all duration-300">
                    {/* Desktop Only Actions */}
                    <div className="hidden md:flex items-center gap-1">
                        <button
                            onClick={toggleDarkMode}
                            title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                            className="w-8 h-8 flex items-center justify-center rounded-full text-text-muted hover:text-text-primary hover:bg-surface-elevated/50 transition-all active:scale-90 focus-ring font-medium"
                        >
                            {isDarkMode ? <Sun size={15} /> : <Moon size={15} />}
                        </button>
                        <div className="w-px h-4 bg-border mx-0.5" />
                        <button className="w-8 h-8 flex items-center justify-center rounded-full text-text-muted hover:text-text-primary transition-all hover:bg-surface-elevated/50 active:scale-90"><Users size={15} /></button>
                        <div className="w-px h-4 bg-border mx-0.5" />
                    </div>

                    {/* Notifications (Global) */}
                    <div className="relative flex items-center" ref={dropdownRef}>
                        <button 
                            onClick={() => setShowNotifications(!showNotifications)}
                            className={`w-8 h-8 flex items-center justify-center rounded-full transition-all active:scale-90 ${showNotifications || notifications.length > 0 ? "text-primary bg-primary/10" : "text-text-muted hover:text-text-primary hover:bg-surface-elevated/50"}`}
                        >
                            <Bell size={15} />
                            {notifications.length > 0 && (
                                <span className="absolute top-1 right-1 w-2 h-2 bg-error rounded-full animate-pulse shadow-glow" />
                            )}
                        </button>
                        
                        {/* Notifications Dropdown */}
                        {showNotifications && (
                            <div className="absolute top-full right-0 mt-3 w-80 glass rounded-2xl shadow-premium border-glass-border overflow-hidden z-[1000] animate-scaleIn origin-top-right">
                                <div className="p-3 border-b border-border bg-surface-2/50 flex justify-between items-center">
                                    <h3 className="font-bold text-sm text-text-primary tracking-tight">Notifications</h3>
                                    {notifications.length > 0 && (
                                        <span className="text-[10px] font-bold bg-primary/20 text-primary px-2 py-0.5 rounded-full">{notifications.length}</span>
                                    )}
                                </div>
                                <div className="max-h-[70vh] md:max-h-[400px] overflow-y-auto custom-scrollbar">
                                    {notifications.length > 0 ? (
                                        notifications.map(req => (
                                            <div key={req.id} className="p-3 border-b border-border last:border-0 hover:bg-surface-2/30 transition-colors flex gap-3 items-start">
                                                <div className="w-10 h-10 rounded-xl bg-surface-2 overflow-hidden flex-shrink-0">
                                                    <Image src={req.senderData?.avatar || "/user-fill.svg"} alt="" width={40} height={40} className="w-full h-full object-cover" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[13px] font-medium text-text-primary leading-tight">
                                                        <span className="font-bold">{req.senderData?.name || "Someone"}</span> wants to connect
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-2">
                                                        <button 
                                                            onClick={() => handleRequestAction(req.id, "accepted")}
                                                            className="flex-1 py-1.5 primary-gradient text-white text-[12px] font-bold rounded-lg shadow-glow active:scale-95 transition-all flex items-center justify-center gap-1"
                                                        >
                                                            <Check size={12} strokeWidth={3} /> Accept
                                                        </button>
                                                        <button 
                                                            onClick={() => handleRequestAction(req.id, "declined")}
                                                            className="flex-1 py-1.5 bg-surface-2 border border-border text-text-primary text-[12px] font-bold rounded-lg hover:bg-surface-elevated active:scale-95 transition-all flex items-center justify-center gap-1"
                                                        >
                                                            <X size={12} strokeWidth={3} /> Decline
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="p-8 text-center flex flex-col items-center gap-2 opacity-60">
                                            <Bell size={24} className="text-text-muted" />
                                            <p className="text-[13px] font-medium text-text-secondary">No new notifications</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Additional Desktop Actions */}
                    <div className="hidden md:flex items-center gap-1">
                        <div className="w-px h-4 bg-border mx-0.5" />
                        <button className="w-8 h-8 flex items-center justify-center rounded-full text-text-muted hover:text-primary hover:bg-primary/5 transition-all active:scale-90"><MessageSquare size={15} /></button>
                        <div className="w-px h-4 bg-border mx-0.5" />
                        <button onClick={logout} className="w-8 h-8 flex items-center justify-center rounded-full text-text-muted hover:text-error hover:bg-error/10 transition-all active:scale-90"><LogOut size={15} /></button>
                    </div>
                </div>

                {user && (
                    <button
                        onClick={openProfileModal}
                        className="relative group/avatar focus-ring rounded-xl ml-2 mr-1"
                    >
                        <div className="w-9 h-9 rounded-xl primary-gradient p-[1.5px] group-hover/avatar:scale-105 transition-transform shadow-premium">
                            <div className="w-full h-full rounded-[9px] bg-surface overflow-hidden">
                                <Image
                                    src={user.photoURL || "/user-fill.svg"}
                                    alt="Profile"
                                    width={36}
                                    height={36}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        </div>
                    </button>
                )}
            </div>
        </header>
    );
};

export default Navbar;