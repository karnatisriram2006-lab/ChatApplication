import Image from "next/image"; 
import { useAuth } from "@/context/AuthContext";
import { useState, useEffect } from "react";

const Navbar = () => {
    const { user, logout } = useAuth();
    const [isDarkMode, setIsDarkMode] = useState(false);

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
        <header className="fixed top-0 left-0 right-0 h-[64px] bg-white/80 dark:bg-gray-950/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 z-50 px-6 flex items-center justify-between transition-colors duration-200">
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-xl">C</span>
                </div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-gray-800 to-gray-500 dark:from-white dark:to-gray-400 bg-clip-text text-transparent italic">
                    ChatApp.
                </h1>
            </div>

            <div className="flex items-center gap-3 sm:gap-6">
                <div className="flex items-center gap-1.5 sm:gap-4 py-1.5 px-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-800 transition-colors duration-200">
                    <button onClick={toggleDarkMode} className="hover:opacity-100 transition-opacity flex items-center" title="Toggle Dark Mode">
                        <Image 
                            src={isDarkMode ? "/sun.svg" : "/moon.svg"} 
                            alt="Theme" 
                            width={18} 
                            height={18} 
                            className={`opacity-60 hover:opacity-100 ${isDarkMode ? "invert brightness-0" : "dark:brightness-0 dark:invert"}`} 
                        />
                    </button>
                    <Image src="/team-fill.svg" alt="Team" title="Team/Contacts" width={18} height={18} className="opacity-60 cursor-pointer hover:opacity-100 transition-opacity dark:brightness-0 dark:invert" />
                    <Image src="/chat-1-fill.svg" alt="Chat" title="Chat" width={18} height={18} className="text-blue-600 dark:brightness-0 dark:invert opacity-80" />
                    <button onClick={logout} className="hover:opacity-100 transition-opacity flex items-center" title="Logout">
                         <Image src="/logout-box-line.svg" alt="Logout" width={18} height={18} className="opacity-60 dark:brightness-0 dark:invert" />
                    </button>
                    <Image src="/more-2-fill.svg" alt="More" title="More Options" width={18} height={18} className="opacity-60 cursor-pointer hover:opacity-100 transition-opacity dark:brightness-0 dark:invert" />
                </div>
                
                {user && (
                    <div className="flex items-center gap-3">
                        <div className="text-right hidden sm:block">
                            <p className="text-sm font-bold text-gray-800 dark:text-gray-100 leading-tight transition-colors duration-200">{user.displayName}</p>
                            <p className="text-[10px] text-green-500 font-medium tracking-wide uppercase">Online</p>
                        </div>
                        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 p-[2px]">
                            <div className="w-full h-full rounded-full bg-white dark:bg-gray-900 p-[1px] transition-colors duration-200">
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
                )}
            </div>
        </header>
    );
};

export default Navbar;