"use client";

import { useState } from "react";
import Image from "next/image";
import { db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { X, Camera, Save } from "lucide-react";

interface ProfileModalProps {
    user: any;
    onClose: () => void;
}

const ProfileModal = ({ user, onClose }: ProfileModalProps) => {
    const [name, setName] = useState(user.displayName || "");
    const [bio, setBio] = useState(user.bio || "Hey there! I am using ChatApp.");
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const userRef = doc(db, "users", user.uid);
            await updateDoc(userRef, {
                name: name,
                nameLowercase: name.toLowerCase(),
                bio: bio
            });
            // Note: In a real app, we might also want to update Firebase Auth profile,
            // but for this MVP, updating the Firestore 'users' doc is sufficient for the chat.
            onClose();
        } catch (error) {
            console.error("Error updating profile:", error);
            alert("Failed to update profile.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn p-4 overflow-y-auto">
            <div className="bg-white dark:bg-surface-elevated w-full max-w-md rounded-3xl overflow-hidden shadow-2xl border border-gray-100 dark:border-white/5 animate-scaleIn flex flex-col max-h-[90vh]">
                <div className="flex-shrink-0 p-6 border-b border-gray-100 dark:border-white/5 flex justify-between items-center bg-gray-50/50 dark:bg-background/50 px-8">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 italic tracking-tight">Profile Settings</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full transition-all active:scale-95">
                        <X size={22} className="text-gray-500" />
                    </button>
                </div>

                <div className="p-8 flex flex-col items-center gap-8 overflow-y-auto custom-scrollbar">
                    <div className="relative group/avatar">
                        <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-blue-500/20 p-1 bg-white dark:bg-background shadow-lg transition-transform group-hover/avatar:scale-105 duration-300">
                            <Image 
                                src={user.photoURL || "/user-fill.svg"} 
                                alt="Profile" 
                                width={128} 
                                height={128} 
                                className="w-full h-full rounded-full object-cover"
                            />
                        </div>
                        <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity cursor-pointer backdrop-blur-[2px]">
                            <Camera size={28} className="text-white drop-shadow-md" />
                        </div>
                    </div>

                    <div className="w-full space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest ml-1">Display Name</label>
                            <input 
                                type="text" 
                                value={name} 
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-5 py-4 bg-gray-50 dark:bg-background border border-gray-100 dark:border-white/5 rounded-2xl outline-none focus:border-blue-500 transition-all text-gray-800 dark:text-gray-100 font-semibold"
                                placeholder="Your name"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest ml-1">About / Bio</label>
                            <textarea 
                                value={bio} 
                                onChange={(e) => setBio(e.target.value)}
                                className="w-full px-5 py-4 bg-gray-50 dark:bg-background border border-gray-100 dark:border-white/5 rounded-2xl outline-none focus:border-emerald-500 transition-all text-gray-800 dark:text-gray-100 font-medium resize-none h-28 leading-relaxed"
                                placeholder="Tell us about yourself..."
                            />
                        </div>
                    </div>

                    <button 
                        onClick={handleSave}
                        disabled={isSaving}
                        className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-black text-lg rounded-2xl shadow-xl shadow-blue-500/20 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50 disabled:active:scale-100"
                    >
                        {isSaving ? (
                            <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <><Save size={22} strokeWidth={2.5} /> Update Profile</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProfileModal;
