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
        <header className="fixed top-0 left-0 right-0 h-[56px] glass z-[100] px-6 flex items-center justify-between transition-all duration-300">
            <div className="flex items-center gap-2.5 group cursor-pointer">
                <div className="w-8 h-8 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform">
                    <span className="text-white font-bold text-lg">C</span>
                </div>
                <h1 className="text-lg font-black tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent">
                    ChatApp<span className="text-blue-500">.</span>
                </h1>
            </div>

            <div className="flex items-center gap-8">
                <div className="flex items-center gap-5 px-4 py-1.5 bg-gray-100/50 dark:bg-gray-800/40 rounded-full border border-gray-200/30 dark:border-white/5 transition-all">
                    <button onClick={toggleDarkMode} className="hover:scale-110 active:scale-95 transition-all" title="Toggle Dark Mode">
                        <Image 
                            src={isDarkMode ? "/sun.svg" : "/moon.svg"} 
                            alt="Theme" 
                            width={16} 
                            height={16} 
                            className={`opacity-70 hover:opacity-100 ${isDarkMode ? "invert" : "dark:invert"}`} 
                        />
                    </button>
                    <div className="w-[1px] h-4 bg-gray-300 dark:bg-gray-700 mx-1 opacity-50" />
                    <button className="hover:scale-110 opacity-60 hover:opacity-100 transition-all">
                        <Image src="/team-fill.svg" alt="Team" width={16} height={16} className="dark:invert" />
                    </button>
                    <button className="hover:scale-110 opacity-60 hover:opacity-100 transition-all">
                        <Image src="/chat-1-fill.svg" alt="Chat" width={16} height={16} className="dark:invert text-blue-500" />
                    </button>
                    <button onClick={logout} className="hover:scale-110 opacity-60 hover:opacity-100 transition-all text-red-500">
                         <Image src="/logout-box-line.svg" alt="Logout" width={16} height={16} className="dark:invert" />
                    </button>
                </div>
                
                {user && (
                    <div className="flex items-center gap-3 pl-4 border-l border-gray-200/50 dark:border-white/5">
                        <div className="text-right hidden sm:block">
                            <p className="text-xs font-bold text-gray-800 dark:text-gray-100 leading-none mb-1">{user.displayName}</p>
                            <div className="flex items-center justify-end gap-1.5">
                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse-soft" />
                                <p className="text-[9px] text-emerald-500 font-bold tracking-widest uppercase">Active</p>
                            </div>
                        </div>
                        <div className="relative group/avatar cursor-pointer" onClick={openProfileModal}>
                            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-500 p-[2px] transition-transform group-hover/avatar:scale-105 shadow-md">
                                <div className="w-full h-full rounded-full bg-white dark:bg-gray-900 p-[1px]">
                                    <Image 
                                        src={user.photoURL||"/user-fill.svg"} 
                                        alt="Profile" 
                                        width={32} 
                                        height={32} 
                                        className="rounded-full overflow-hidden object-cover h-full" 
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