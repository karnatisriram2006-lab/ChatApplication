"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { X, Users, Check, Search, Plus } from "lucide-react";

interface GroupModalProps {
    currentUser: string;
    onClose: () => void;
}

interface User {
    uid: string;
    name: string;
    avatar: string;
}

const GroupModal = ({ currentUser, onClose }: GroupModalProps) => {
    const [contacts, setContacts] = useState<User[]>([]);
    const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
    const [groupName, setGroupName] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [isCreating, setIsCreating] = useState(false);

    useEffect(() => {
        const fetchContacts = async () => {
            const q = query(collection(db, "users"), orderBy("name", "asc"));
            const snapshot = await getDocs(q);
            const usersData: User[] = [];
            snapshot.forEach((doc) => {
                if (doc.id !== currentUser) {
                    usersData.push({
                        uid: doc.id,
                        name: doc.data().name,
                        avatar: doc.data().avatar
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

            // Add first message
            await addDoc(collection(db, "messages"), {
                roomId: groupRef.id,
                author: currentUser,
                message: `Group "${groupName}" created`,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                timestamp: serverTimestamp(),
                system: true
            });

            onClose();
        } catch (error) {
            console.error("Error creating group:", error);
            alert("Failed to create group.");
        } finally {
            setIsCreating(false);
        }
    };

    const filteredContacts = contacts.filter(c => 
        c.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn p-4 overflow-y-auto">
            <div className="bg-white dark:bg-gray-950 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl border border-gray-100 dark:border-gray-800 animate-scaleIn flex flex-col max-h-[90vh]">
                <div className="flex-shrink-0 p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50 px-8">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 italic tracking-tight">Create New Group</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full transition-all active:scale-95">
                        <X size={22} className="text-gray-500" />
                    </button>
                </div>

                <div className="p-8 flex flex-col gap-8 overflow-y-auto custom-scrollbar">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest ml-1">Group Details</label>
                        <div className="relative group/input">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within/input:text-emerald-500 transition-colors">
                                <Users size={20} />
                            </div>
                            <input 
                                type="text" 
                                value={groupName} 
                                onChange={(e) => setGroupName(e.target.value)}
                                className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl outline-none focus:border-emerald-500 dark:focus:border-emerald-500 transition-all text-gray-800 dark:text-gray-100 font-semibold"
                                placeholder="What's the group name?"
                            />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest ml-1">Add Members ({selectedMembers.length})</label>
                        <div className="relative mb-4 group/search">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within/search:text-blue-500 transition-colors" size={18} />
                            <input 
                                type="text" 
                                value={searchQuery} 
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl outline-none focus:border-blue-500 transition-all text-sm font-medium"
                                placeholder="Search friends..."
                            />
                        </div>
                        <div className="max-h-64 overflow-y-auto pr-2 flex flex-col gap-2 custom-scrollbar">
                            {filteredContacts.length > 0 ? filteredContacts.map(contact => (
                                <div 
                                    key={contact.uid} 
                                    onClick={() => toggleMember(contact.uid)}
                                    className={`flex items-center justify-between p-3.5 rounded-2xl cursor-pointer transition-all duration-200 border ${selectedMembers.includes(contact.uid) ? 'bg-blue-50/50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 scale-[1.02]' : 'hover:bg-gray-50 dark:hover:bg-gray-900 border-transparent shadow-sm'}`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="relative">
                                            <Image src={contact.avatar || "/user-fill.svg"} alt={contact.name} width={40} height={40} className="rounded-full bg-white dark:bg-gray-800 object-cover border border-gray-100 dark:border-gray-800" />
                                            {selectedMembers.includes(contact.uid) && (
                                                <div className="absolute -top-1 -right-1 bg-blue-600 text-white rounded-full p-0.5 border-2 border-white dark:border-gray-950 animate-scaleIn">
                                                    <Check size={10} strokeWidth={4} />
                                                </div>
                                            )}
                                        </div>
                                        <p className={`text-sm font-bold tracking-tight ${selectedMembers.includes(contact.uid) ? 'text-blue-700 dark:text-blue-400' : 'text-gray-800 dark:text-gray-100'}`}>{contact.name}</p>
                                    </div>
                                    <div className={`w-5 h-5 rounded-full border-2 transition-all flex items-center justify-center ${selectedMembers.includes(contact.uid) ? 'bg-blue-600 border-blue-600' : 'border-gray-300 dark:border-gray-700'}`}>
                                        {selectedMembers.includes(contact.uid) && <Check size={12} className="text-white" strokeWidth={3} />}
                                    </div>
                                </div>
                            )) : (
                                <p className="text-center py-8 text-sm text-gray-400 font-medium italic">No friends found.</p>
                            )}
                        </div>
                    </div>

                    <button 
                        onClick={handleCreateGroup}
                        disabled={isCreating || !groupName.trim() || selectedMembers.length === 0}
                        className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-lg rounded-2xl shadow-xl shadow-emerald-500/20 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale disabled:active:scale-100"
                    >
                        {isCreating ? (
                            <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
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
