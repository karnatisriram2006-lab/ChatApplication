import Image from "next/image"; 
import { useAuth } from "@/context/AuthContext";

const Navbar = () => {
    const { user, logout } = useAuth();

    return (
        <header className="fixed top-0 left-0 right-0 h-[64px] bg-white/80 backdrop-blur-md border-b border-gray-100 z-50 px-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-xl">C</span>
                </div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-gray-800 to-gray-500 bg-clip-text text-transparent italic">
                    ChatApp.
                </h1>
            </div>

            <div className="flex items-center gap-6">
                <div className="flex items-center gap-4 py-1.5 px-3 bg-gray-50 rounded-xl border border-gray-100">
                    <Image src="/team-fill.svg" alt="Team" width={18} height={18} className="opacity-60 cursor-pointer hover:opacity-100 transition-opacity" />
                    <Image src="/chat-1-fill.svg" alt="Chat" width={18} height={18} className="text-blue-600" />
                    <button onClick={logout} className="hover:opacity-100 transition-opacity flex items-center">
                         <Image src="/logout-box-line.svg" alt="Logout" width={18} height={18} className="opacity-60" />
                    </button>
                    <Image src="/more-2-fill.svg" alt="More" width={18} height={18} className="opacity-60 cursor-pointer hover:opacity-100 transition-opacity" />
                </div>
                
                {user && (
                    <div className="flex items-center gap-3">
                        <div className="text-right hidden sm:block">
                            <p className="text-sm font-bold text-gray-800 leading-tight">{user.displayName}</p>
                            <p className="text-[10px] text-green-500 font-medium tracking-wide uppercase">Online</p>
                        </div>
                        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 p-[2px]">
                            <div className="w-full h-full rounded-full bg-white p-[1px]">
                                <Image 
                                    src={user.photoURL||"/user-fill.svg"} 
                                    alt="Profile" 
                                    width={32} 
                                    height={32} 
                                    className="rounded-full overflow-hidden" 
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