"use client";

import { useState, useRef, useEffect } from "react";
import EmojiPicker, { Theme } from "emoji-picker-react";
import { Smile, Mic, Square, Trash2 } from "lucide-react";
import Image from "next/image";
import VoiceMessage from "./VoiceMessage";
import { db } from "@/lib/firebase";
import { useChatStore } from "@/store/useChatStore";
import { 
    collection, 
    addDoc, 
    query, 
    where, 
    orderBy, 
    onSnapshot, 
    doc,
    setDoc,
    deleteDoc,
    writeBatch,
    getDocs,
    serverTimestamp,
    Timestamp,
    limit
} from "firebase/firestore";
import { rtdb } from "@/lib/firebase";
import { ref, onValue, set, onDisconnect } from "firebase/database";

interface Message {
    id?: string;
    roomId: string;
    author: string;
    message: string;
    time: string;
    timestamp?: Timestamp;
    read?: boolean;
    imageUrl?: string;
    audioUrl?: string;
    reaction?: string;
    replyTo?: {
        message: string;
        author: string;
    };
}

interface MessagesProps {
    currentUser: string;
}

const Messages = ({ currentUser }: MessagesProps) => {
    const { selectedUser, setSelectedUser } = useChatStore();
    const [currentMessage, setCurrentMessage] = useState("");
    const [messageList, setMessageList] = useState<Message[]>([]);
    const [requestStatus, setRequestStatus] = useState<string | null>(null);
    const [requestSender, setRequestSender] = useState<string | null>(null);
    const [friendProfile, setFriendProfile] = useState<{ name: string; avatar: string; status: string; lastSeen?: any; members?: string[] } | null>(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [friendTyping, setFriendTyping] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
    const [isGroup, setIsGroup] = useState(false);
    const [groupMembers, setGroupMembers] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [messageSearchQuery, setMessageSearchQuery] = useState("");
    const [reactionMsgId, setReactionMsgId] = useState<string | null>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const emojiRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const isTypingRef = useRef(false);
    const [msgLimit, setMsgLimit] = useState(50);
    const [isDark, setIsDark] = useState(false);
    const [replyTo, setReplyTo] = useState<Message | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        audioRef.current = new Audio('/notification.mp3');
        
        // Setup observer to check for dark class on html
        const checkDarkMode = () => {
            setIsDark(document.documentElement.classList.contains("dark"));
        };
        checkDarkMode();
        const observer = new MutationObserver(checkDarkMode);
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
        return () => observer.disconnect();
    }, []);
   
    const roomId = isGroup ? selectedUser! : [currentUser, selectedUser!].sort().join("_");
    const requestId = roomId;

    useEffect(() => {
        if (!currentUser || !selectedUser) return;

        let unsubProfile: (() => void) | null = null;
        let unsubPresence: (() => void) | null = null;
        let unsubTyping: (() => void) | null = null;
        let unsubRequest: (() => void) | null = null;
        let unsubMessages: (() => void) | null = null;

        const setupChat = async () => {
            // 1. Detect if it's a group
            const groupSnap = await getDocs(query(collection(db, "groups"), where("__name__", "==", selectedUser)));
            
            if (!groupSnap.empty) {
                setIsGroup(true);
                const data = groupSnap.docs[0].data();
                setFriendProfile({
                    name: data.name || "Group",
                    avatar: data.avatar || "/team-fill.svg",
                    status: "Group",
                    members: data.members
                } as any);
                setRequestStatus("accepted");
                
                // Fetch member names
                const membersData: any[] = [];
                for (const memberId of data.members) {
                    const memberSnap = await getDocs(query(collection(db, "users"), where("__name__", "==", memberId)));
                    if (!memberSnap.empty) {
                        membersData.push({ uid: memberId, name: memberSnap.docs[0].data().name });
                    }
                }
                setGroupMembers(membersData);
            } else {
                setIsGroup(false);
                // 1v1 Profile & Presence
                unsubProfile = onSnapshot(doc(db, "users", selectedUser), (snap) => {
                    if (snap.exists()) {
                        const d = snap.data();
                        setFriendProfile(prev => {
                            const base = prev || { name: "User", avatar: "/user-fill.svg", status: "Offline" };
                            return {
                                ...base,
                                name: d.name || base.name,
                                avatar: d.avatar || base.avatar,
                                lastSeen: d.lastSeen || base.lastSeen,
                                // Only take status from Firestore if we don't have it from RTDB yet
                                status: prev?.status === "Online" || prev?.status === "Offline" ? prev.status : (d.status || "Offline")
                            };
                        });
                    }
                });

                unsubPresence = onValue(ref(rtdb, `presence/${selectedUser}`), (snap) => {
                    const d = snap.val();
                    if (d) {
                        setFriendProfile(prev => {
                            const base = prev || { name: "User", avatar: "/user-fill.svg", status: "Offline" };
                            return {
                                ...base,
                                status: d.status || "Offline",
                                lastSeen: d.lastSeen ? { toDate: () => new Date(d.lastSeen) } : base.lastSeen
                            };
                        });
                    }
                });

                unsubTyping = onValue(ref(rtdb, `typing/${roomId}/${selectedUser}`), (snap) => {
                    setFriendTyping(!!snap.val());
                });

                unsubRequest = onSnapshot(doc(db, "chatRequests", requestId), (snap) => {
                    if (snap.exists()) {
                        const d = snap.data();
                        setRequestStatus(d.status);
                        setRequestSender(d.from);
                    } else {
                        setRequestStatus(null);
                        setRequestSender(null);
                    }
                });
            }

            // 2. Fetch Messages (Unified for Group/1v1)
            const q = query(collection(db, "messages"), where("roomId", "==", roomId), orderBy("timestamp", "desc"), limit(msgLimit));
            unsubMessages = onSnapshot(q, (snapshot) => {
                const messages: Message[] = [];
                const unreadBatch = writeBatch(db);
                let hasUnread = false;

                snapshot.forEach((snap) => {
                    const d = snap.data();
                    messages.unshift({ id: snap.id, ...d } as Message);
                    if (d.author !== currentUser && !d.read) {
                        unreadBatch.update(doc(db, "messages", snap.id), { read: true });
                        hasUnread = true;
                    }
                });

                if (hasUnread) {
                    unreadBatch.commit().catch(err => console.error("Error marking read:", err));
                    if (audioRef.current) audioRef.current.play().catch(e => console.log("Audio play prevented:", e));
                }
                setMessageList(messages);
            });
        };

        setupChat();

        return () => {
            if (unsubProfile) unsubProfile();
            if (unsubPresence) unsubPresence();
            if (unsubTyping) unsubTyping();
            if (unsubRequest) unsubRequest();
            if (unsubMessages) unsubMessages();
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        };
    }, [selectedUser, currentUser, roomId, requestId, msgLimit]);

    const handleTyping = () => {
        if (requestStatus !== "accepted" || isGroup) return;
        const myTypingRef = ref(rtdb, `typing/${roomId}/${currentUser}`);
        
        if (!isTypingRef.current) {
            isTypingRef.current = true;
            set(myTypingRef, true);
            onDisconnect(myTypingRef).remove();
        }
        
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            isTypingRef.current = false;
            set(myTypingRef, false);
        }, 2000);
    };

    const onEmojiClick = (emojiData: any) => { setCurrentMessage((prev) => prev + emojiData.emoji); };
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (emojiRef.current && !emojiRef.current.contains(event.target as Node)) setShowEmojiPicker(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const previousMessageCount = useRef(0);
    useEffect(() => { 
        const msgDiff = messageList.length - previousMessageCount.current;
        if (msgDiff <= 1) {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
        previousMessageCount.current = messageList.length;
    }, [messageList]);

    const sendRequest = async () => {
        setIsActionLoading(true);
        try {
            await setDoc(doc(db, "chatRequests", requestId), { from: currentUser, to: selectedUser, status: "pending", timestamp: serverTimestamp() });
        } catch (error) { console.error("Error sending request:", error); } finally { setIsActionLoading(false); }
    };

    const handleRequestAction = async (action: "accepted" | "declined") => {
        setIsActionLoading(true);
        try { await setDoc(doc(db, "chatRequests", requestId), { status: action }, { merge: true }); }
        catch (error) { console.error(`Error ${action} request:`, error); } finally { setIsActionLoading(false); }
    };

    const sendMessage = async () => {
        if (currentMessage.trim() !== "" && requestStatus === "accepted") {
            const messageData: any = {
                roomId: roomId, author: currentUser, message: currentMessage.trim(),
                time: new Date(Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                timestamp: serverTimestamp(),
            };
            if (replyTo) {
                messageData.replyTo = {
                    message: replyTo.message,
                    author: replyTo.author
                };
            }
            try {
                setCurrentMessage("");
                setReplyTo(null);
                await addDoc(collection(db, "messages"), messageData);
            } catch (error) { console.error("Error sending message: ", error); }
        }
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            const chunks: BlobPart[] = [];

            mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
            mediaRecorder.onstop = () => {
                const blob = new Blob(chunks, { type: "audio/webm" });
                setAudioBlob(blob);
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
            setRecordingTime(0);
            recordingIntervalRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);
        } catch (error) {
            console.error("Error starting recording:", error);
            alert("Could not access microphone.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
        }
    };

    const sendAudioMessage = async () => {
        if (!audioBlob) return;
        setIsUploading(true);
        try {
            const signRes = await fetch('/api/upload/sign');
            const { signature, timestamp, apiKey, cloudName } = await signRes.json();
            
            const formData = new FormData();
            formData.append("file", audioBlob);
            formData.append("api_key", apiKey);
            formData.append("timestamp", timestamp.toString());
            formData.append("signature", signature);
            formData.append("resource_type", "video"); // Cloudinary treats audio as video resource type

            const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, { 
                method: "POST", 
                body: formData 
            });
            
            const cloudinaryData = await uploadRes.json();
            const messageData = {
                roomId: roomId, author: currentUser, message: "Voice Message", audioUrl: cloudinaryData.secure_url,
                time: new Date(Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), timestamp: serverTimestamp(),
            };
            await addDoc(collection(db, "messages"), messageData);
            setAudioBlob(null);
        } catch (error) {
            console.error("Error sending audio:", error);
        } finally {
            setIsUploading(false);
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || requestStatus !== "accepted") return;
        
        setIsUploading(true);
        try {
            // 1. Fetch secure signature from Next.js server
            const signRes = await fetch('/api/upload/sign');
            if (!signRes.ok) throw new Error("Could not acquire secure upload signature from server");
            const { signature, timestamp, apiKey, cloudName } = await signRes.json();
            
            if (!cloudName || !apiKey) {
                alert("Server misconfigured: Missing Cloudinary credentials.");
                return setIsUploading(false);
            }

            // 2. Perform signed multipart upload directly to Cloudinary edge network
            const formData = new FormData();
            formData.append("file", file);
            formData.append("api_key", apiKey);
            formData.append("timestamp", timestamp.toString());
            formData.append("signature", signature);

            const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { 
                method: "POST", 
                body: formData 
            });
            
            if (!uploadRes.ok) throw new Error("Cloudinary secure upload failed");
            const cloudinaryData = await uploadRes.json();
            
            // 3. Save the image to the database
            const messageData = {
                roomId: roomId, author: currentUser, message: "Photo", imageUrl: cloudinaryData.secure_url,
                time: new Date(Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), timestamp: serverTimestamp(),
            };
            await addDoc(collection(db, "messages"), messageData);
        } catch (error) { 
            console.error("Error uploading secure image: ", error); 
            alert("Failed to upload image. Please try again.");
        } finally { 
            setIsUploading(false); 
        }
    };

    const handleReaction = async (messageId: string, emoji: string) => {
        try { await setDoc(doc(db, "messages", messageId), { reaction: emoji }, { merge: true }); } 
        catch (error) { console.error("Error reacting:", error); }
    };

    const deleteMessage = async (messageId: string) => {
        try { await deleteDoc(doc(db, "messages", messageId)); } 
        catch (error) { console.error("Error deleting message: ", error); }
    };

    const clearChat = async () => {
        try {
            const q = query(collection(db, "messages"), where("roomId", "==", roomId));
            const snapshot = await getDocs(q);
            const batch = writeBatch(db);
            snapshot.forEach((doc) => batch.delete(doc.ref));
            await batch.commit(); setIsMenuOpen(false); setShowClearConfirm(false);
        } catch (error) { console.error("Error clearing chat: ", error); }
    };

    return (
        <div className="w-full h-full flex flex-col overflow-hidden relative bg-gray-50/30 dark:bg-gray-950/30">
            {lightboxUrl && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-fadeIn" onClick={() => setLightboxUrl(null)}>
                    <button className="absolute top-4 right-5 text-white/70 hover:text-white text-3xl font-light z-10 leading-none" onClick={() => setLightboxUrl(null)} title="Close">✕</button>
                    <div className="relative max-w-[90vw] max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
                        <img src={lightboxUrl} alt="Full size photo" className="max-w-[90vw] max-h-[90vh] object-contain rounded-xl shadow-2xl" />
                        <a href={lightboxUrl} target="_blank" rel="noopener noreferrer" className="absolute bottom-3 right-3 text-white/60 hover:text-white text-xs bg-black/40 px-2 py-1 rounded-lg transition" onClick={(e) => e.stopPropagation()}>Open original ↗</a>
                    </div>
                </div>
            )}
            
            <section className="h-16 w-full glass flex items-center px-6 sticky top-0 z-50 shadow-sm transition-all duration-300 border-b border-gray-200/50 dark:border-white/5">
                {!isSearching ? (
                    <>
                        <button onClick={() => setSelectedUser(null)} className="md:hidden p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">
                            <Image src="/chevron-left.svg" alt="Back" width={24} height={24} className="dark:invert" />
                        </button>
                        <div className="flex items-center gap-3.5 animate-fadeIn">
                            <div className="relative group/avatar cursor-pointer">
                                <div className="w-10 h-10 rounded-2xl overflow-hidden shadow-sm ring-2 ring-transparent group-hover/avatar:ring-blue-500/20 transition-all">
                                    <Image src={friendProfile?.avatar || "/user-fill.svg"} alt={friendProfile?.name || "User Profile"} width={40} height={40} className="w-full h-full object-cover bg-white dark:bg-gray-900" />
                                </div>
                                {friendProfile?.status === "Online" && !isGroup && (
                                    <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white dark:border-gray-950 rounded-full animate-pulse-soft shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                )}
                            </div>
                            <div className="flex flex-col">
                                <div className="flex items-center gap-2">
                                    <p className="font-black text-[15px] text-gray-900 dark:text-gray-100 tracking-tight leading-none">{friendProfile?.name || "Loading..."}</p>
                                    {!isGroup && friendProfile?.status === "Online" && (
                                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                    )}
                                </div>
                                {isGroup ? (
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">
                                        {friendProfile?.members?.length} Members
                                    </p>
                                ) : friendTyping ? (
                                    <div className="flex items-center gap-1 mt-1">
                                        <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">Typing</p>
                                        <div className="flex gap-0.5">
                                            <span className="w-1 h-1 bg-blue-500 rounded-full animate-bounce-dots" style={{ animationDelay: '0s' }} />
                                            <span className="w-1 h-1 bg-blue-500 rounded-full animate-bounce-dots" style={{ animationDelay: '0.2s' }} />
                                            <span className="w-1 h-1 bg-blue-500 rounded-full animate-bounce-dots" style={{ animationDelay: '0.4s' }} />
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-1">
                                        {friendProfile?.status === "Online" ? "Active Now" : (<>Last seen {friendProfile?.lastSeen?.toDate ? friendProfile.lastSeen.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : "recently"}</>)}
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="ml-auto flex gap-4 text-gray-400 dark:text-gray-500 items-center animate-fadeIn">
                            <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">
                                <Image src="/video-on-fill.svg" alt="Video" width={20} height={20} className="dark:invert opacity-70" />
                            </button>
                            <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">
                                <Image src="/phone-fill.svg" width={20} height={20} alt="Call" className="dark:invert opacity-70" />
                            </button>
                            <button 
                                onClick={() => setIsSearching(true)}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                            >
                                <Image src="/search-line.svg" alt="Search" width={20} height={20} className="dark:invert opacity-70" />
                            </button>
                            <div className="relative">
                                <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">
                                    <Image src="/more-2-fill.svg" alt="More" width={20} height={20} className="dark:invert opacity-70" />
                                </button>
                                {isMenuOpen && (
                                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 py-2 z-[100] animate-scaleIn">
                                        <button onClick={() => {setIsMenuOpen(false); setShowClearConfirm(true);}} className="w-full text-left px-4 py-3 text-sm text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 font-semibold transition-colors flex items-center gap-3">
                                            <Image src="/chat-delete-fill.svg" alt="Clear" width={18} height={18} className="opacity-70 dark:invert" /> Clear Chat
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="w-full flex items-center gap-4 animate-fadeIn">
                        <button onClick={() => {setIsSearching(false); setMessageSearchQuery("");}} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors text-gray-500">
                             <Image src="/chevron-left.svg" alt="Back" width={24} height={24} className="dark:invert" />
                        </button>
                        <div className="flex-1 bg-gray-50 dark:bg-gray-900 rounded-2xl px-4 py-2 border border-gray-100 dark:border-gray-800 flex items-center gap-3">
                            <Image src="/search-line.svg" alt="Search" width={18} height={18} className="opacity-40 dark:invert" />
                            <input 
                                type="text" 
                                placeholder="Search in chat..." 
                                autoFocus
                                className="bg-transparent border-none outline-none w-full text-sm font-medium text-gray-700 dark:text-gray-200"
                                value={messageSearchQuery}
                                onChange={(e) => setMessageSearchQuery(e.target.value)}
                            />
                            {messageSearchQuery && (
                                <button onClick={() => setMessageSearchQuery("")} className="text-gray-400 hover:text-gray-600">✕</button>
                            )}
                        </div>
                    </div>
                )}
            </section>

            <div className="flex-1 flex flex-col overflow-hidden relative">
                {showClearConfirm && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fadeIn">
                        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-6 shadow-xl max-w-sm w-full mx-4 flex flex-col gap-4">
                            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">Clear Chat?</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Are you sure you want to clear this entire chat? This action cannot be undone.</p>
                            <div className="flex gap-3 justify-end mt-2">
                                <button onClick={() => setShowClearConfirm(false)} className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">Cancel</button>
                                <button onClick={clearChat} className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors shadow-sm">Clear Chat</button>
                            </div>
                        </div>
                    </div>
                )}
                {requestStatus === "accepted" ? (
                    <>
                        <section className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 relative scroll-shadow-top scroll-shadow-bottom">
                            <div className="absolute inset-0 z-0 opacity-[0.06] dark:opacity-[0.03] pointer-events-none" style={{ backgroundImage: "url('/backgroundforchat.jpg')", backgroundSize: "400px" }} />
                            <div className="relative z-10 flex flex-col gap-4">
                            {messageList.length === 0 && (
                                <div className="flex-1 flex flex-col items-center justify-center opacity-20 pointer-events-none">
                                    <Image src="/message-2-fill.svg" alt="No messages" width={100} height={100} className="dark:invert" />
                                    <p className="mt-4 text-sm font-medium dark:text-gray-200">Say hi to {friendProfile?.name}!</p>
                                </div>
                            )}
                            {messageList.length >= msgLimit && (
                                <div className="flex justify-center mb-4">
                                    <button 
                                        onClick={() => setMsgLimit(prev => prev + 50)} 
                                        className="text-xs font-semibold px-4 py-2 bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-gray-700 rounded-full shadow-sm hover:scale-105 transition-transform"
                                    >
                                        Load older messages
                                    </button>
                                </div>
                            )}
                            {messageList
                                .filter(msg => msg.message.toLowerCase().includes(messageSearchQuery.toLowerCase()))
                                .map((msg, index) => {
                                    const isGrouped = index > 0 && messageList[index-1].author === msg.author;
                                    return (
                                        <div key={msg.id || index} className={`flex flex-col group ${isGrouped ? "mt-1" : "mt-6"} ${msg.author === currentUser ? "items-end" : "items-start"}`}>
                                            {!isGrouped && isGroup && msg.author !== currentUser && (
                                                <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest ml-12 mb-1 animate-fadeIn">
                                                    {groupMembers.find(m => m.uid === msg.author)?.name || "Member"}
                                                </p>
                                            )}
                                            <div className={`flex items-end gap-3 max-w-[85%] sm:max-w-[70%] relative animate-messageIn`}>
                                                {msg.author !== currentUser && !isGrouped && (
                                                    <div className="w-8 h-8 rounded-xl overflow-hidden shadow-sm flex-shrink-0 mb-1 border border-gray-100 dark:border-white/5">
                                                        <Image 
                                                            src={groupMembers.find(m => m.uid === msg.author)?.avatar || friendProfile?.avatar || "/user-fill.svg"} 
                                                            alt="Author" 
                                                            width={32} 
                                                            height={32} 
                                                            className="w-full h-full object-cover" 
                                                        />
                                                    </div>
                                                )}
                                                {msg.author !== currentUser && isGrouped && <div className="w-8 flex-shrink-0" />}

                                                <div className={`relative group/bubble transition-all duration-300 ${
                                                    msg.author === currentUser 
                                                        ? `rounded-2xl shadow-md px-4 py-2.5 
                                                           bg-gradient-to-br from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 
                                                           text-white ${isGrouped ? "rounded-tr-lg" : "rounded-tr-none"}` 
                                                        : `rounded-2xl shadow-sm px-4 py-2.5 
                                                           bg-white dark:bg-gray-800 border border-gray-100/50 dark:border-white/5 
                                                           text-gray-800 dark:text-gray-100 ${isGrouped ? "rounded-tl-lg" : "rounded-tl-none"}`
                                                }`}>
                                                    {msg.replyTo && (
                                                        <div className={`mb-2 p-2 rounded-xl text-[11px] font-medium backdrop-blur-sm ${
                                                            msg.author === currentUser 
                                                                ? 'bg-white/10 border-r-4 border-white/50 text-white/90' 
                                                                : 'bg-black/5 dark:bg-white/5 border-l-4 border-blue-500/50'
                                                        }`}>
                                                            <p className="font-black mb-0.5 tracking-tight">{msg.replyTo?.author === currentUser ? "You" : (groupMembers.find(m => m.uid === msg.replyTo?.author)?.name || friendProfile?.name)}</p>
                                                            <p className="line-clamp-2 opacity-80 italic">"{msg.replyTo.message}"</p>
                                                        </div>
                                                    )}
                                                    
                                                    {msg.imageUrl ? (
                                                        <div className="relative w-48 h-48 sm:w-64 sm:h-64 rounded-xl overflow-hidden mb-1 cursor-pointer group/img shadow-inner" onClick={() => setLightboxUrl(msg.imageUrl!)}>
                                                            <Image src={msg.imageUrl} alt="Uploaded photo" fill className="object-cover transition-transform duration-500 group-hover/img:scale-105" />
                                                            <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/20 transition-colors flex items-center justify-center">
                                                                <span className="text-white text-2xl opacity-0 group-hover/img:opacity-100 transition-opacity">🔍</span>
                                                            </div>
                                                        </div>
                                                    ) : msg.audioUrl ? (
                                                        <div className="py-1">
                                                            <VoiceMessage audioUrl={msg.audioUrl} isMe={msg.author === currentUser} />
                                                        </div>
                                                    ) : (
                                                        <p className="leading-relaxed text-[14px] font-medium break-words">
                                                            {msg.message}
                                                        </p>
                                                    )}

                                                    <div className="flex items-center justify-end gap-1.5 mt-1 opacity-70">
                                                        <p className="text-[9px] font-black uppercase tracking-widest">{msg.time}</p>
                                                        {msg.author === currentUser && (
                                                            <span className={`text-[12px] font-black ${msg.read ? "text-blue-300" : "text-white/40"}`}>
                                                                {msg.read ? "✓✓" : "✓"}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {msg.reaction && (
                                                        <div className={`absolute -bottom-3 ${msg.author === currentUser ? 'right-2' : 'left-2'} glass ring-2 ring-white dark:ring-gray-900 rounded-full px-1.5 py-0.5 shadow-xl text-xs select-none animate-scaleIn`}>
                                                            {msg.reaction}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className={`flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300 absolute top-1/2 -translate-y-1/2 z-10 ${msg.author === currentUser ? '-left-28' : '-right-28'}`}>
                                                    <button onClick={() => setReplyTo(msg)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl text-lg hover:scale-110 transition-all" title="Reply">↩️</button>
                                                    <button onClick={() => setReactionMsgId(reactionMsgId === msg.id ? null : (msg.id || null))} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl text-lg hover:scale-110 transition-all" title="React">😀</button>
                                                    {msg.author === currentUser && msg.id && (
                                                        <button onClick={() => deleteMessage(msg.id!)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl hover:scale-110 transition-all">
                                                            <Image src="/chat-delete-fill.svg" alt="Delete" width={16} height={16} className="opacity-50 hover:opacity-100 dark:invert transition-opacity" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <div ref={messagesEndRef} />
                        </section>

                        <section className="p-3 sm:p-4 pb-[env(safe-area-inset-bottom,12px)] bg-white/50 dark:bg-gray-950/50 backdrop-blur-md border-t border-gray-100 dark:border-gray-800">
                            {isRecording ? (
                                <div className="mb-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-xl flex items-center justify-between animate-pulse border border-red-100 dark:border-red-800/50">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping" />
                                        <p className="text-sm font-bold text-red-600 dark:text-red-400">Recording... {formatTime(recordingTime)}</p>
                                    </div>
                                    <button onClick={stopRecording} className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors">
                                        <Square size={16} fill="white" />
                                    </button>
                                </div>
                            ) : audioBlob ? (
                                <div className="mb-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-between border border-blue-100 dark:border-blue-800/50 animate-slideIn">
                                    <div className="flex items-center gap-3">
                                        <Mic size={18} className="text-blue-500" />
                                        <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">Voice message ready</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => setAudioBlob(null)} className="p-2 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full transition-colors">
                                            <Trash2 size={18} />
                                        </button>
                                        <button onClick={sendAudioMessage} className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors">
                                            <Image src="/send-plane-fill.svg" alt="Send" width={18} height={18} className="brightness-0 invert" />
                                        </button>
                                    </div>
                                </div>
                            ) : replyTo && (
                                <div className="mb-2 p-3 bg-gray-100 dark:bg-gray-900 rounded-xl border-l-4 border-blue-500 flex justify-between items-start animate-slideIn">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[11px] font-bold text-blue-600 dark:text-blue-400">Replying to {replyTo.author === currentUser ? "yourself" : friendProfile?.name}</p>
                                        <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{replyTo.message}</p>
                                    </div>
                                    <button onClick={() => setReplyTo(null)} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full">
                                        <Image src="/close-circle-fill.svg" alt="Cancel" width={16} height={16} className="opacity-40 dark:invert" />
                                    </button>
                                </div>
                            )}
                            {showEmojiPicker && (
                                <div ref={emojiRef} className="absolute bottom-20 left-4 z-50 animate-fadeIn">
                                    <EmojiPicker onEmojiClick={onEmojiClick} theme={isDark ? Theme.DARK : Theme.LIGHT} height={350} width={300} />
                                </div>
                            )}
                            <div className="flex items-center mb-1 gap-3 bg-gray-100/40 dark:bg-white/5 rounded-2xl px-4 py-2 border border-gray-200/50 dark:border-white/5 focus-within:bg-white dark:focus-within:bg-gray-900 focus-within:border-blue-500/50 focus-within:shadow-xl focus-within:shadow-blue-500/5 transition-all duration-300">
                                <button onClick={() => setShowEmojiPicker((prev) => !prev)} className="hover:scale-125 transition-all flex-shrink-0 opacity-60 hover:opacity-100">
                                    <Smile size={20} className="text-gray-600 dark:text-gray-300" />
                                </button>
                                <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageUpload} />
                                <button onClick={() => fileInputRef.current?.click()} className="hover:scale-125 transition-all flex-shrink-0 opacity-40 hover:opacity-100">
                                    <Image src="/add-large-fill.svg" alt="Attach Image" width={20} height={20} className="dark:invert" />
                                </button>
                                <button onClick={startRecording} className="hover:scale-125 transition-all flex-shrink-0 opacity-40 hover:opacity-100">
                                    <Mic size={20} className="text-gray-600 dark:text-gray-300" />
                                </button>
                                <div className="w-[1px] h-4 bg-gray-300 dark:bg-gray-700 mx-1 opacity-50" />
                                <input
                                    type="text" placeholder={`Type a message...`}
                                    className="flex-1 w-full min-w-0 bg-transparent border-none outline-none text-[14px] py-1 font-bold placeholder:text-gray-400 dark:placeholder:text-gray-500 text-gray-800 dark:text-gray-200"
                                    value={currentMessage} onChange={(e) => { setCurrentMessage(e.target.value); handleTyping(); }}
                                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                                />
                                <button 
                                    onClick={sendMessage} 
                                    className={`
                                        p-2 rounded-xl transition-all flex-shrink-0 group/send
                                        ${currentMessage.trim() 
                                            ? "bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/40 scale-100 hover:scale-110 active:scale-95" 
                                            : "bg-gray-200 dark:bg-gray-800 opacity-40 scale-95 pointer-events-none"
                                        }
                                    `} 
                                    disabled={!currentMessage.trim() && !isUploading}
                                >
                                    {isUploading ? (
                                        <div className="w-4 h-4 rounded-full border-2 border-white/50 border-t-white animate-spin m-0.5" />
                                    ) : (
                                        <Image src="/send-plane-fill.svg" alt="Send" width={18} height={18} className="brightness-0 invert transition-transform group-hover/send:rotate-12" />
                                    )}
                                </button>
                            </div>
                        </section>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-gray-50/50 dark:bg-gray-950/50">
                        <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mb-6">
                            <Image src="/shield-user-fill.svg" alt="Privacy" width={40} height={40} className="opacity-60 dark:invert" />
                        </div>
                        {!requestStatus && (
                            <>
                                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">Connect with {friendProfile?.name}</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs mb-8">You need to send a chat request before you can start messaging each other.</p>
                                <button onClick={sendRequest} disabled={isActionLoading} className="bg-blue-600 text-white font-semibold py-3 px-8 rounded-xl hover:bg-blue-700 transition shadow-lg shadow-blue-100 dark:shadow-blue-900/20 flex justify-center items-center gap-2 disabled:opacity-50">
                                    {isActionLoading && <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"></div>}
                                    Send Chat Request
                                </button>
                            </>
                        )}
                        {requestStatus === "pending" && requestSender === currentUser && (
                            <>
                                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">Request Sent!</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">Waiting for {friendProfile?.name} to accept your chat request.</p>
                                <div className="mt-8 px-6 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full text-xs font-bold uppercase tracking-wider">Pending Approval</div>
                            </>
                        )}
                        {requestStatus === "pending" && requestSender !== currentUser && (
                            <>
                                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">New Chat Request</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs mb-8">{friendProfile?.name} wants to start a private conversation with you.</p>
                                <div className="flex gap-4 w-full max-w-xs">
                                    <button onClick={() => handleRequestAction("declined")} disabled={isActionLoading} className="flex-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-semibold py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition flex justify-center items-center disabled:opacity-50">Decline</button>
                                    <button onClick={() => handleRequestAction("accepted")} disabled={isActionLoading} className="flex-1 bg-blue-600 text-white font-semibold py-3 rounded-xl hover:bg-blue-700 transition shadow-md shadow-blue-100 dark:shadow-blue-900 flex justify-center items-center gap-2 disabled:opacity-50">
                                        {isActionLoading && <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"></div>} Accept
                                    </button>
                                </div>
                            </>
                        )}
                        {requestStatus === "declined" && (
                            <>
                                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">Request Unavailable</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">This chat request was declined or is no longer available.</p>
                                <button onClick={sendRequest} disabled={isActionLoading} className="mt-8 text-blue-600 dark:text-blue-400 font-bold hover:underline disabled:opacity-50">Try sending again</button>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Messages;
