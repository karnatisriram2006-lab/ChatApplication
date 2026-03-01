import Image from "next/image"; 
import { useAuth } from "@/context/AuthContext";
import { useState, useEffect } from "react";
import ProfileModal from "./ProfileModal";
import { useModalStore } from "@/store/useModalStore";

const Navbar = () => {
    const { user, logout } = useAuth();
    const [isDarkMode, setIsDarkMode] = useState(false);
    const { openProfileModal } = useModalStore();

    useEffect(() => {
        // Check initial state
        if (document.documentElement.classList.contains("dark")) {
            setIsDarkMode(true);
        }
    }, []);

    const toggleDarkMode = () => {
        if (isDarkMode) {
            document.documentElement.classList.remove("dark");
            setIsDarkMode(false);
            localStorage.setItem("theme", "light");
        } else {
            document.documentElement.classList.add("dark");
            setIsDarkMode(true);
            localStorage.setItem("theme", "dark");
        }
    };

    return (
        <header className="fixed top-0 left-0 right-0 h-[56px] border-b border-border bg-sidebar-surface/70 backdrop-blur-md z-[100] px-2 md:px-6 flex items-center justify-between transition-all duration-300">
            <div className="flex items-center gap-1.5 md:gap-2.5 group cursor-pointer">
                <div className="w-8 h-8 bg-gradient-to-tr from-primary to-indigo-400 rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform flex-shrink-0">
                    <span className="text-white font-bold text-lg">C</span>
                </div>
                <h1 className="text-lg font-black tracking-tight text-text-primary hidden xs:block">
                    ChatApp<span className="text-primary">.</span>
                </h1>
            </div>

            <div className="flex items-center gap-2 md:gap-8">
                <div className="flex items-center gap-2 md:gap-5 px-2 md:px-4 py-1.5 bg-input-surface rounded-full border border-border transition-all">
                    <button onClick={toggleDarkMode} className="hover:scale-110 active:scale-95 transition-all text-text-muted hover:text-primary" title="Toggle Dark Mode">
                         <Image 
                            src={isDarkMode ? "/sun.svg" : "/moon.svg"} 
                            alt="Theme" 
                            width={16} 
                            height={16} 
                            className="dark:invert opacity-70 hover:opacity-100 transition-all" 
                        />
                    </button>
                    <div className="w-[1px] h-4 bg-border mx-0.5 md:mx-1 opacity-50" />
                    <button className="hover:scale-110 text-text-muted hover:text-primary transition-all">
                        <Image src="/team-fill.svg" alt="Team" width={16} height={16} className="dark:invert opacity-60 hover:opacity-100" />
                    </button>
                    <button className="hover:scale-110 text-primary transition-all">
                        <Image src="/chat-1-fill.svg" alt="Chat" width={16} height={16} className="dark:invert opacity-100" />
                    </button>
                    <button onClick={logout} className="hover:scale-110 text-error transition-all">
                         <Image src="/logout-box-line.svg" alt="Logout" width={16} height={16} className="dark:invert opacity-60 hover:opacity-100" />
                    </button>
                </div>
                
                {user && (
                    <div className="flex items-center gap-2 md:gap-3 pl-2 md:pl-4 border-l border-border">
                        <div className="text-right hidden sm:block">
                            <p className="text-xs font-bold text-text-primary leading-none mb-1">{user.displayName}</p>
                            <div className="flex items-center justify-end gap-1.5">
                                <span className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse-cyan shadow-[0_0_4px_rgba(34,211,238,0.5)]" />
                                <p className="text-[9px] text-accent font-bold tracking-widest uppercase opacity-80">Active</p>
                            </div>
                        </div>
                        <div className="relative group/avatar cursor-pointer flex-shrink-0" onClick={openProfileModal}>
                            <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl md:rounded-2xl bg-gradient-to-tr from-primary to-indigo-400 p-[1.5px] transition-transform group-hover/avatar:scale-105 shadow-md">
                                <div className="w-full h-full rounded-xl md:rounded-2xl bg-sidebar-surface p-[1px] overflow-hidden">
                                    <Image 
                                        src={user.photoURL||"/user-fill.svg"} 
                                        alt="Profile" 
                                        width={32} 
                                        height={32} 
                                        className="w-full h-full object-cover dark:invert" 
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </header>
    );
};

export default Navbar;