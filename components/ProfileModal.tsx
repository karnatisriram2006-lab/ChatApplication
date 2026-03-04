"use client";

import { useState } from "react";
import Image from "next/image";
import { db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { X, Camera, Save, User as UserIcon } from "lucide-react";

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
            await updateDoc(userRef, { name: name, nameLowercase: name.toLowerCase(), bio: bio });
            onClose();
        } catch (error) {
            console.error("Error updating profile:", error);
            alert("Failed to update profile.");
        } finally { setIsSaving(false); }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 dark:bg-black/60 backdrop-blur-sm animate-fadeIn p-4 overflow-y-auto">
            <div className="glass w-full max-w-md rounded-[32px] overflow-hidden shadow-premium animate-scaleIn flex flex-col max-h-[90vh] noise-panel border-glass-border">
                <div className="flex-shrink-0 p-6 border-b border-border flex justify-between items-center bg-surface-2/30 px-8">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                            <UserIcon size={20} className="text-primary" />
                        </div>
                        <h2 className="text-xl font-bold text-text-primary tracking-tight">Profile Settings</h2>
                    </div>
                    <button onClick={onClose} className="w-9 h-9 flex items-center justify-center hover:bg-surface-2 rounded-full transition-all active:scale-90 focus-ring">
                        <X size={20} className="text-text-muted" />
                    </button>
                </div>

                <div className="p-8 flex flex-col items-center gap-8 overflow-y-auto custom-scrollbar">
                    <div className="relative group/avatar">
                        <div className="w-32 h-32 rounded-3xl overflow-hidden border-4 border-primary/10 p-1 glass shadow-premium transition-transform group-hover/avatar:scale-105 duration-300">
                            <Image src={user.photoURL || "/user-fill.svg"} alt="" width={128} height={128} className="w-full h-full rounded-[20px] object-cover" />
                        </div>
                        <div className="absolute inset-0 bg-black/40 rounded-3xl flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-all cursor-pointer backdrop-blur-[2px]">
                            <Camera size={28} className="text-white drop-shadow-md" />
                        </div>
                    </div>

                    <div className="w-full space-y-6">
                        <div className="space-y-2">
                            <label className="text-[12px] font-bold text-primary uppercase tracking-widest ml-1 opacity-80">Display Name</label>
                            <input 
                                type="text" value={name} onChange={(e) => setName(e.target.value)}
                                className="w-full px-5 py-4 bg-input-surface border border-border rounded-2xl outline-none focus:border-primary/40 focus:ring-4 focus:ring-primary/5 transition-all text-text-primary font-bold placeholder:text-text-muted/40"
                                placeholder="Your name"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[12px] font-bold text-accent uppercase tracking-widest ml-1 opacity-80">About / Bio</label>
                            <textarea 
                                value={bio} onChange={(e) => setBio(e.target.value)}
                                className="w-full px-5 py-4 bg-input-surface border border-border rounded-2xl outline-none focus:border-accent/40 focus:ring-4 focus:ring-accent/5 transition-all text-text-primary font-medium resize-none h-28 leading-relaxed custom-scrollbar"
                                placeholder="Tell us about yourself..."
                            />
                        </div>
                    </div>

                    <button onClick={handleSave} disabled={isSaving} className="w-full py-4 primary-gradient text-white font-black text-lg rounded-2xl shadow-glow transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50 focus-ring">
                        {isSaving ? <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>Update Profile</>}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProfileModal;
