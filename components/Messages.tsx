"use client";

import { useState, useRef, useEffect } from "react";
import EmojiPicker, { Theme } from "emoji-picker-react";
import {
    Smile, Mic, Square, Trash2, Search, ChevronLeft,
    Video, Phone, MoreVertical, Send, Image as ImageIcon,
    X, CornerUpLeft, Check, CheckCheck, Users, Sparkles
} from "lucide-react";
import Image from "next/image";
import VoiceMessage from "./VoiceMessage";
import { db } from "@/lib/firebase";
import { useChatStore } from "@/store/useChatStore";
import {
    collection, addDoc, query, where, orderBy, onSnapshot,
    doc, setDoc, updateDoc, deleteDoc, writeBatch, getDocs,
    serverTimestamp, Timestamp, limit
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
    replyTo?: { message: string; author: string; };
}

interface MessagesProps { currentUser: string; }

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
    const [isDark, setIsDark] = useState(false);
    const [replyTo, setReplyTo] = useState<Message | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [msgLimit, setMsgLimit] = useState(50);

    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const emojiRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const isTypingRef = useRef(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        audioRef.current = new Audio('/notification.mp3');
        const checkDark = () => setIsDark(document.documentElement.classList.contains("dark"));
        checkDark();
        const obs = new MutationObserver(checkDark);
        obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
        
        const handleClickOutside = (event: MouseEvent) => {
            if (emojiRef.current && !emojiRef.current.contains(event.target as Node)) {
                setShowEmojiPicker(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        
        return () => {
            obs.disconnect();
            document.removeEventListener("mousedown", handleClickOutside);
        };
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
            const groupSnap = await getDocs(query(collection(db, "groups"), where("__name__", "==", selectedUser)));
            if (!groupSnap.empty) {
                setIsGroup(true);
                const data = groupSnap.docs[0].data();
                setFriendProfile({ name: data.name || "Group", avatar: data.avatar || "", status: "Group", members: data.members });
                setRequestStatus("accepted");
                const membersData: any[] = [];
                for (const memberId of data.members) {
                    const ms = await getDocs(query(collection(db, "users"), where("__name__", "==", memberId)));
                    if (!ms.empty) membersData.push({ uid: memberId, name: ms.docs[0].data().name });
                }
                setGroupMembers(membersData);
            } else {
                setIsGroup(false);
                unsubProfile = onSnapshot(doc(db, "users", selectedUser), (snap) => {
                    if (snap.exists()) {
                        const d = snap.data();
                        setFriendProfile(prev => ({
                            ...prev || { name: "User", avatar: "", status: "Offline" },
                            name: d.name || "User", avatar: d.avatar || "",
                            lastSeen: d.lastSeen,
                            status: prev?.status === "Online" || prev?.status === "Offline" ? prev.status : (d.status || "Offline")
                        }));
                    }
                });
                unsubPresence = onValue(ref(rtdb, `presence/${selectedUser}`), (snap) => {
                    const d = snap.val();
                    if (d) setFriendProfile(prev => ({ ...prev || { name: "User", avatar: "", status: "Offline" }, status: d.status || "Offline", lastSeen: d.lastSeen ? { toDate: () => new Date(d.lastSeen) } : prev?.lastSeen }));
                });
                unsubTyping = onValue(ref(rtdb, `typing/${roomId}/${selectedUser}`), (snap) => setFriendTyping(!!snap.val()));
                unsubRequest = onSnapshot(doc(db, "chatRequests", requestId), (snap) => {
                    if (snap.exists()) { setRequestStatus(snap.data().status); setRequestSender(snap.data().from); }
                    else { setRequestStatus(null); setRequestSender(null); }
                });
            }
            const q = query(collection(db, "messages"), where("roomId", "==", roomId), orderBy("timestamp", "desc"), limit(msgLimit));
            unsubMessages = onSnapshot(q, (snapshot) => {
                const messages: Message[] = [];
                const batch = writeBatch(db);
                let hasUnread = false;
                snapshot.forEach((snap) => {
                    const d = snap.data();
                    messages.unshift({ id: snap.id, ...d } as Message);
                    if (d.author !== currentUser && !d.read) { batch.update(doc(db, "messages", snap.id), { read: true }); hasUnread = true; }
                });
                if (hasUnread) { batch.commit().catch(console.error); audioRef.current?.play().catch(() => {}); }
                setMessageList(messages);
            });
        };
        setupChat();
        return () => { unsubProfile?.(); unsubPresence?.(); unsubTyping?.(); unsubRequest?.(); unsubMessages?.(); if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current); };
    }, [selectedUser, currentUser, roomId, requestId, msgLimit]);

    useEffect(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), [messageList]);

    const handleTyping = () => {
        if (requestStatus !== "accepted" || isGroup) return;
        const myTypingRef = ref(rtdb, `typing/${roomId}/${currentUser}`);
        if (!isTypingRef.current) { isTypingRef.current = true; set(myTypingRef, true); onDisconnect(myTypingRef).remove(); }
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => { isTypingRef.current = false; set(myTypingRef, false); }, 2000);
    };

    const sendMessage = async () => {
        if (!currentMessage.trim() || requestStatus !== "accepted") return;
        const data: any = { roomId, author: currentUser, message: currentMessage.trim(), time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), timestamp: serverTimestamp() };
        if (replyTo) data.replyTo = { message: replyTo.message, author: replyTo.author };
        try { setCurrentMessage(""); setReplyTo(null); await addDoc(collection(db, "messages"), data); } catch (e) { console.error(e); }
    };

    const deleteMessage = async (msgId: string) => { try { await deleteDoc(doc(db, "messages", msgId)); } catch (e) { console.error(e); } };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || requestStatus !== "accepted") return;
        setIsUploading(true);
        try {
            const { signature, timestamp, apiKey, cloudName } = await (await fetch('/api/upload/sign')).json();
            const form = new FormData();
            form.append("file", file); form.append("api_key", apiKey); form.append("timestamp", timestamp.toString()); form.append("signature", signature);
            const { secure_url } = await (await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: "POST", body: form })).json();
            await addDoc(collection(db, "messages"), { roomId, author: currentUser, message: "Photo", imageUrl: secure_url, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), timestamp: serverTimestamp() });
        } catch (e) { console.error(e); } finally { setIsUploading(false); }
    };

    const sendRequest = async () => {
        if (!currentUser || !selectedUser) return;
        setIsActionLoading(true);
        try {
            await setDoc(doc(db, "chatRequests", requestId), { from: currentUser, to: selectedUser, status: "pending", timestamp: serverTimestamp() });
        } catch (e) { console.error(e); } finally { setIsActionLoading(false); }
    };

    const handleRequestAction = async (newStatus: "accepted" | "declined") => {
        setIsActionLoading(true);
        try { await updateDoc(doc(db, "chatRequests", requestId), { status: newStatus }); }
        catch (e) { console.error(e); } finally { setIsActionLoading(false); }
    };

    const isOnline = friendProfile?.status?.toLowerCase() === "online";
    const statusColor = isOnline ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" : "bg-slate-500";

    return (
        <div className="w-full h-full flex flex-col overflow-hidden relative bg-surface noise-panel transition-colors duration-300">
            {/* Lightbox */}
            {lightboxUrl && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 backdrop-blur-md animate-fadeIn" onClick={() => setLightboxUrl(null)}>
                    <button className="absolute top-5 right-5 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-all focus-ring z-10"><X size={20} /></button>
                    <div className="relative max-w-[90vw] max-h-[90vh] animate-scaleIn" onClick={e => e.stopPropagation()}>
                        <img src={lightboxUrl} alt="Attachment" className="rounded-2xl border border-white/10 max-h-[90vh] object-contain shadow-premium" />
                    </div>
                </div>
            )}

            {/* Header */}
            <header className="floating-header px-4 h-[58px] flex items-center shrink-0 border-glass-border">
                {!isSearching ? (
                    <>
                        <button onClick={() => setSelectedUser(null)} className="md:hidden w-9 h-9 flex items-center justify-center -ml-1 mr-1 rounded-xl text-text-muted hover:bg-surface-2 transition-all cursor-pointer"><ChevronLeft size={22} /></button>
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="relative w-9 h-9 group-hover:scale-105 transition-transform">
                                <div className={`w-full h-full rounded-xl p-[1px] ${isOnline ? "primary-gradient shadow-glow" : "bg-border"}`}>
                                    <div className="w-full h-full rounded-[10px] bg-surface-2 overflow-hidden flex items-center justify-center">
                                        {friendProfile?.avatar ? (
                                            <Image src={friendProfile.avatar} alt={friendProfile.name} width={36} height={36} className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-primary font-bold text-sm">{(friendProfile?.name || "U").charAt(0).toUpperCase()}</span>
                                        )}
                                    </div>
                                </div>
                                {!isGroup && (
                                    <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-background ${statusColor} ${isOnline ? "animate-pulse" : ""}`} />
                                )}
                            </div>
                            <div className="min-w-0">
                                <p className="font-bold text-[15px] sm:text-[20px] text-text-primary tracking-tight truncate leading-tight">
                                    {friendProfile?.name || "Loading..."}
                                </p>
                                <p className={`text-[12px] font-medium leading-none ${friendTyping ? "text-primary animate-fadeIn" : isOnline ? "text-secondary" : "text-text-muted"}`}>
                                    {isGroup ? `${friendProfile?.members?.length ?? 0} members` : friendTyping ? "typing..." : isOnline ? "Online" : "Offline"}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1 ml-auto text-text-muted">
                            <button className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-surface-2 transition-all cursor-pointer"><Video size={18} /></button>
                            <button className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-surface-2 transition-all cursor-pointer"><Phone size={18} /></button>
                            <button onClick={() => setIsSearching(true)} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-surface-2 transition-all cursor-pointer"><Search size={18} /></button>
                            <MoreVertical size={18} className="cursor-pointer hover:text-text-primary ml-1" />
                        </div>
                    </>
                ) : (
                    <div className="w-full flex items-center gap-2 animate-fadeIn">
                         <button onClick={() => { setIsSearching(false); setMessageSearchQuery(""); }} className="w-9 h-9 flex items-center justify-center rounded-xl text-text-muted hover:bg-surface-2 transition-all cursor-pointer"><ChevronLeft size={22} /></button>
                        <input type="text" placeholder="Search messages..." autoFocus className="flex-1 bg-input-surface border border-border rounded-xl px-4 py-2 text-[14px] text-text-primary outline-none focus:ring-1 focus:ring-primary/20 transition-all font-medium" value={messageSearchQuery} onChange={e => setMessageSearchQuery(e.target.value)} />
                    </div>
                )}
            </header>

            {/* List */}
            <main className="flex-1 overflow-y-auto px-4 md:px-8 py-6 flex flex-col custom-scrollbar relative">
                <div className="flex flex-col gap-1 pb-4">
                    {requestStatus === "accepted" ? (
                        messageList.length > 0 ? (
                            messageList
                                .filter(msg => msg.message.toLowerCase().includes(messageSearchQuery.toLowerCase()))
                                .map((msg, index, arr) => {
                                    const isMe = msg.author === currentUser;
                                    const isGrouped = arr[index - 1]?.author === msg.author;
                                    const showAvatar = !isGrouped && !isMe;
                                    
                                    return (
                                        <div key={msg.id || index} className={`flex flex-col ${isMe ? "items-end" : "items-start"} ${isGrouped ? "mt-0.5" : "mt-5"} animate-messageIn`}>
                                            {!isMe && !isGrouped && (
                                                <p className="text-[12px] font-bold text-text-muted mb-1 ml-11 tracking-tight uppercase">
                                                    {isGroup ? groupMembers.find(m => m.uid === msg.author)?.name : friendProfile?.name}
                                                </p>
                                            )}
                                            
                                            <div className="flex items-end gap-2.5 max-w-[85%] sm:max-w-[70%] group/bubble relative">
                                                {!isMe && (
                                                    <div className={`w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 bg-surface-2 transition-opacity duration-300 ${showAvatar ? "opacity-100" : "opacity-0"}`}>
                                                        {showAvatar && friendProfile?.avatar && <Image src={friendProfile.avatar} alt="" width={32} height={32} className="w-full h-full object-cover" />}
                                                    </div>
                                                )}

                                                <div className={`
                                                    relative px-4 py-2.5 shadow-sm transition-all duration-200 hover:scale-[1.02]
                                                    ${isMe 
                                                        ? "primary-gradient text-white rounded-[18px] rounded-br-[4px] shadow-glow" 
                                                        : "bg-sidebar-surface text-text-primary border border-border rounded-[18px] rounded-bl-[4px] font-medium"
                                                    }
                                                `}>
                                                    {msg.replyTo && (
                                                        <div className="bg-black/10 dark:bg-white/10 rounded-lg p-2 mb-2 text-[12px] border-l-2 border-primary/40 truncate opacity-80 italic">
                                                            <p className="font-bold opacity-70 mb-0.5">{msg.replyTo.author === currentUser ? "You" : friendProfile?.name}</p>
                                                            {msg.replyTo.message}
                                                        </div>
                                                    )}

                                                    {msg.imageUrl ? (
                                                        <div className="relative w-64 h-64 rounded-xl overflow-hidden cursor-zoom-in group-hover:scale-[1.01] transition-transform" onClick={() => setLightboxUrl(msg.imageUrl!)}>
                                                            <Image src={msg.imageUrl} alt="" fill className="object-cover" />
                                                        </div>
                                                    ) : msg.audioUrl ? (
                                                        <VoiceMessage audioUrl={msg.audioUrl} isMe={isMe} />
                                                    ) : (
                                                        <p className="text-[14px] leading-relaxed break-words">{msg.message}</p>
                                                    )}

                                                    <div className={`flex items-center gap-1.5 mt-1 ${isMe ? "justify-end" : "justify-start"}`}>
                                                        <span className={`text-[10px] font-bold opacity-60`}>{msg.time}</span>
                                                        {isMe && (msg.read ? <CheckCheck size={12} className="text-white/80" /> : <Check size={12} className="text-white/50" />)}
                                                    </div>

                                                    {/* Hover actions */}
                                                    <div className={`absolute top-1/2 -translate-y-1/2 opacity-0 group-hover/bubble:opacity-100 transition-all flex items-center gap-1 ${isMe ? "right-full mr-2" : "left-full ml-2"}`}>
                                                        <button onClick={() => setReplyTo(msg)} className="w-8 h-8 rounded-full glass flex items-center justify-center hover:text-primary transition-all active:scale-90 cursor-pointer"><CornerUpLeft size={14} /></button>
                                                        <button onClick={() => deleteMessage(msg.id!)} className="w-8 h-8 rounded-full glass flex items-center justify-center hover:text-error transition-all active:scale-90 cursor-pointer"><Trash2 size={14} /></button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center py-20 px-10 text-center gap-5 animate-fadeIn">
                                <div className="w-20 h-20 primary-gradient rounded-3xl flex items-center justify-center shadow-premium transform rotate-3 hover:rotate-0 transition-transform">
                                    <Sparkles size={40} className="text-white opacity-80" />
                                </div>
                                <div>
                                    <h2 className="text-[20px] font-black text-text-primary tracking-tight">✨ Start the conversation</h2>
                                    <p className="text-[14px] text-text-secondary max-w-xs mt-1">Send your first message to {friendProfile?.name || "Request"}. Premium end-to-end encrypted.</p>
                                </div>
                            </div>
                        )
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center py-20 px-10 text-center gap-5">
                            <div className="w-16 h-16 glass rounded-2xl flex items-center justify-center shadow-premium"><Users size={32} className="text-primary opacity-60" /></div>
                            <div>
                                <h2 className="text-[20px] font-bold text-text-primary">Chat Request</h2>
                                <p className="text-[14px] text-text-secondary max-w-xs mt-1">Start messaging in a premium SaaS-grade secure environment.</p>
                            </div>
                            {requestStatus === "pending" ? (
                                <button disabled className="px-8 py-3 bg-surface-2 text-text-muted rounded-xl border border-border text-[14px] font-bold opacity-60">Request Pending...</button>
                            ) : requestSender === currentUser ? (
                                <button disabled className="px-8 py-3 bg-surface-2 text-text-muted rounded-xl border border-border text-[14px] font-bold opacity-60">Request Sent</button>
                            ) : requestSender ? (
                                <div className="flex items-center gap-3">
                                    <button onClick={() => handleRequestAction("accepted")} className="px-6 py-2.5 primary-gradient text-white font-bold rounded-xl shadow-glow active:scale-95 transition-all cursor-pointer">Accept</button>
                                    <button onClick={() => handleRequestAction("declined")} className="px-6 py-2.5 bg-surface-2 text-text-primary font-bold rounded-xl border border-border active:scale-95 transition-all cursor-pointer">Decline</button>
                                </div>
                            ) : (
                                <button onClick={sendRequest} className="px-8 py-3 primary-gradient text-white font-bold rounded-xl shadow-glow active:scale-95 transition-all cursor-pointer">Send Chat Request</button>
                            )}
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </main>

            {/* Input */}
            {requestStatus === "accepted" && (
                <footer className="px-4 py-4 md:px-6 transition-all duration-300 relative z-50">
                    {replyTo && (
                        <div className="max-w-4xl mx-auto mb-2 glass p-3 rounded-xl flex items-center justify-between border-l-4 border-primary animate-slideIn">
                            <div className="min-w-0">
                                <p className="text-[11px] font-black text-primary uppercase">Replying to {replyTo.author === currentUser ? "Yourself" : friendProfile?.name}</p>
                                <p className="text-[13px] text-text-secondary truncate">{replyTo.message}</p>
                            </div>
                            <button onClick={() => setReplyTo(null)} className="p-1 hover:bg-white/10 rounded-full transition-colors"><X size={14} /></button>
                        </div>
                    )}
                    <div className="max-w-4xl mx-auto flex items-end gap-3 glass p-2 rounded-[22px] shadow-premium focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/30 transition-all border-glass-border relative">
                        {showEmojiPicker && (
                            <div className="absolute bottom-full left-0 mb-4 z-50 animate-messageIn shadow-premium rounded-2xl overflow-hidden border border-glass-border" ref={emojiRef}>
                                <EmojiPicker
                                    theme={isDark ? Theme.DARK : Theme.LIGHT}
                                    onEmojiClick={(emojiData) => setCurrentMessage(prev => prev + emojiData.emoji)}
                                    lazyLoadEmojis={true}
                                />
                            </div>
                        )}
                        <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className={`w-10 h-10 flex flex-shrink-0 items-center justify-center rounded-xl transition-all active:scale-90 cursor-pointer ${showEmojiPicker ? "bg-primary/20 text-primary" : "hover:bg-surface-2 text-text-muted"}`}><Smile size={22} /></button>
                        <textarea
                            className="flex-1 bg-transparent border-none outline-none py-2.5 px-1 text-[14px] text-text-primary placeholder:text-text-muted/50 resize-none max-h-32 custom-scrollbar font-medium"
                            placeholder="Write a message..." rows={1} value={currentMessage}
                            onChange={e => { setCurrentMessage(e.target.value); handleTyping(); }}
                            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                        />
                        <button onClick={() => fileInputRef.current?.click()} className="w-10 h-10 flex flex-shrink-0 items-center justify-center rounded-xl hover:bg-surface-2 text-text-muted transition-all active:scale-90 cursor-pointer"><ImageIcon size={22} /></button>
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                        <button onClick={sendMessage} disabled={!currentMessage.trim()} className="w-10 h-10 flex flex-shrink-0 items-center justify-center rounded-[16px] primary-gradient text-white shadow-glow hover:scale-[1.05] active:scale-90 transition-all cursor-pointer disabled:opacity-50 disabled:grayscale">
                            <Send size={20} className="-mr-0.5" />
                        </button>
                    </div>
                </footer>
            )}
        </div>
    );
};

export default Messages;
