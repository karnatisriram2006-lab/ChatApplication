"use client";

import Image from "next/image";
import { useState } from "react";
import Navbar from "@/components/Navbar";
import Content from "@/components/Content";
import Messages from "@/components/Messages";
import { useAuth } from "@/context/AuthContext";

export default function Home() {
  const { user, loading, loginWithGoogle } = useAuth();
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="relative h-screen flex items-center justify-center overflow-hidden">
        <Image
          alt="Mountains background"
          src="/backgroundimage.jpg"
          fill
          style={{ objectFit: 'cover', zIndex: -1 }}
          priority
        />
        <div className="bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl p-8 rounded-3xl shadow-2xl w-full max-w-md flex flex-col items-center gap-6 border border-white/20 dark:border-gray-800">
          <div className="flex flex-col items-center gap-2">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 text-center">Welcome to ChatApp</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Sign in to start chatting securely</p>
          </div>
          <div className="w-full">
            <button
              onClick={loginWithGoogle}
              className="w-full py-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-200 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-800/80 active:scale-95 transition-all shadow-lg flex items-center justify-center gap-3"
            >
              <Image src="/google-fill.svg" alt="Google" width={20} height={20} />
              Continue with Google
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-screen flex flex-col overflow-hidden">
      <Image
        alt="Mountains background"
        src="/backgroundimage.jpg"
        quality={100}
        fill
        style={{
          objectFit: 'cover',
          zIndex: -1,
        }}
        priority
      />

      <Navbar />
      
      <main className="flex flex-1 overflow-hidden mt-[64px]">
        {/* Sidebar/Chats list */}
        <div className={`w-full md:w-[350px] border-r border-gray-200/20 dark:border-gray-800/50 backdrop-blur-sm bg-white/80 dark:bg-gray-950/90 transition-colors duration-200 ${selectedUser ? "hidden md:flex" : "flex"}`}>
          <Content 
            onSelectUser={setSelectedUser} 
            selectedUser={selectedUser} 
            currentUser={user.uid} 
          />
        </div>

        {/* Chat area */}
        <div className={`flex-1 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md transition-colors duration-200 ${selectedUser ? "flex" : "hidden md:flex"}`}>
          {selectedUser ? (
            <Messages 
                currentUser={user.uid} 
                selectedUser={selectedUser} 
                onBack={() => setSelectedUser(null)} 
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 gap-4">
              <div className="p-6 bg-gray-100 dark:bg-gray-800/50 rounded-full">
                <Image src="/message-2-fill.svg" alt="Chat" width={40} height={40} className="opacity-20 dark:invert" />
              </div>
              <p>Select a contact to start messaging</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
