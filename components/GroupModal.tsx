"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { X, Users, Check, Search, Plus } from "lucide-react";
import { logger } from "@/lib/logger";

interface GroupModalProps {
    currentUser: string;
    onClose: () => void;
}

interface ContactUser {
    uid: string;
    name: string;
    avatar: string;
}

const GroupModal = ({ currentUser, onClose }: GroupModalProps) => {
    const [contacts, setContacts] = useState<ContactUser[]>([]);
    const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
    const [groupName, setGroupName] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [isCreating, setIsCreating] = useState(false);

    useEffect(() => {
        const fetchContacts = async () => {
            const q = query(collection(db, "users"), orderBy("name", "asc"));
            const snapshot = await getDocs(q);
            const usersData: ContactUser[] = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                if (doc.id !== currentUser) {
                    usersData.push({
                        uid: doc.id,
                        name: data.name,
                        avatar: data.avatar
                    });
                }
            });
            setContacts(usersData);
        };
        fetchContacts();
    }, [currentUser]);

    const toggleMember = (uid: string) => {
        setSelectedMembers(prev => 
            prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
        );
    };

    const handleCreateGroup = async () => {
        if (!groupName.trim() || selectedMembers.length === 0) {
            alert("Please provide a group name and select at least one member.");
            return;
        }

        setIsCreating(true);
        try {
            const members = [...selectedMembers, currentUser];
            const groupRef = await addDoc(collection(db, "groups"), {
                name: groupName.trim(),
                members: members,
                createdBy: currentUser,
                avatar: "/team-fill.svg",
                timestamp: serverTimestamp()
            });

            await addDoc(collection(db, "messages"), {
                roomId: groupRef.id,
                author: currentUser,
                text: `Group "${groupName}" created`,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                createdAt: serverTimestamp(),
                system: true
            });

            onClose();
        } catch (error) {
            logger.error("Error creating group:", error);
            alert("Failed to create group.");
        } finally {
            setIsCreating(false);
        }
    };

    const filteredContacts = contacts.filter(c => 
        c.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 dark:bg-black/60 backdrop-blur-sm animate-fadeIn p-4 overflow-y-auto">
            <div className="glass w-full max-w-lg rounded-[32px] overflow-hidden shadow-premium border-glass-border animate-scaleIn flex flex-col max-h-[90vh] noise-panel">
                <div className="flex-shrink-0 p-6 border-b border-border flex justify-between items-center bg-surface-2/30 px-8">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                            <Plus size={22} className="text-primary" />
                        </div>
                        <h2 className="text-xl font-bold text-text-primary tracking-tight">Create New Group</h2>
                    </div>
                    <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-surface-2 transition-all active:scale-90 focus-ring">
                        <X size={22} className="text-text-muted" />
                    </button>
                </div>

                <div className="p-8 flex flex-col gap-8 overflow-y-auto custom-scrollbar">
                    <div className="space-y-2">
                        <label className="text-[12px] font-bold text-primary uppercase tracking-widest ml-1">Group Name</label>
                        <input 
                            type="text" 
                            value={groupName} 
                            onChange={(e) => setGroupName(e.target.value)}
                            className="w-full px-5 py-4 bg-input-surface border border-border rounded-2xl outline-none focus:border-primary/40 focus:ring-4 focus:ring-primary/5 transition-all text-text-primary font-bold placeholder:text-text-muted/40"
                            placeholder="Enter group name..."
                        />
                    </div>

                    <div className="space-y-3">
                        <label className="text-[12px] font-bold text-primary uppercase tracking-widest ml-1">Add Members ({selectedMembers.length})</label>
                        <div className="relative mb-4 group/search">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within/search:text-primary transition-colors" size={18} />
                            <input 
                                type="text" 
                                value={searchQuery} 
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 bg-input-surface border border-border rounded-xl outline-none focus:border-primary/40 focus:ring-4 focus:ring-primary/5 transition-all text-sm font-medium text-text-primary placeholder:text-text-muted/40"
                                placeholder="Search friends..."
                            />
                        </div>
                        <div className="max-h-64 overflow-y-auto pr-2 flex flex-col gap-2 custom-scrollbar">
                            {filteredContacts.length > 0 ? filteredContacts.map(contact => (
                                <div 
                                    key={contact.uid}
                                    onClick={() => toggleMember(contact.uid)}
                                    className={`
                                        flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all duration-200 border
                                        ${selectedMembers.includes(contact.uid)
                                            ? "bg-primary/8 dark:bg-primary/15 border-primary shadow-sm" 
                                            : "bg-surface-2/20 dark:bg-surface-2/40 border-transparent hover:bg-surface-2 hover:border-border"
                                        }
                                    `}
                                >
                                    <div className="flex-1 flex items-center gap-4">
                                        <div className="relative">
                                            <div className="w-11 h-11 rounded-xl glass p-[1.5px] shadow-sm">
                                                <Image src={contact.avatar || "/user-fill.svg"} alt={contact.name} width={40} height={40} className="w-full h-full rounded-[10px] object-cover" />
                                            </div>
                                            {selectedMembers.includes(contact.uid) && (
                                                <div className="absolute -top-1 -right-1 bg-primary text-white rounded-full p-0.5 border-2 border-surface shadow-glow animate-scaleIn">
                                                    <Check size={10} strokeWidth={4} />
                                                </div>
                                            )}
                                        </div>
                                        <p className={`text-[15px] font-bold tracking-tight ${selectedMembers.includes(contact.uid) ? 'text-primary' : 'text-text-primary'}`}>{contact.name}</p>
                                    </div>
                                    <div className={`w-5 h-5 rounded-full border-2 transition-all flex items-center justify-center ${selectedMembers.includes(contact.uid) ? 'bg-primary border-primary' : 'border-border'}`}>
                                        {selectedMembers.includes(contact.uid) && <Check size={12} className="text-white" strokeWidth={3} />}
                                    </div>
                                </div>
                            )) : (
                                <p className="text-center py-8 text-sm text-text-muted font-medium italic opacity-60">No friends found.</p>
                            )}
                        </div>
                    </div>

                    <button 
                        onClick={handleCreateGroup}
                        disabled={isCreating || !groupName.trim() || selectedMembers.length === 0}
                        className="w-full py-4 primary-gradient text-white font-black text-lg rounded-2xl shadow-glow transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale mt-2 focus-ring"
                    >
                        {isCreating ? (
                            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>Create Group <Plus size={20} strokeWidth={3} /></>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GroupModal;
