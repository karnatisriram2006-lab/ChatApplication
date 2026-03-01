"use client";

import { useState, useRef, useEffect } from "react";
import EmojiPicker, { Theme } from "emoji-picker-react";
import { Smile, Mic, Square, Trash2, Search, ChevronLeft, Video, Phone, MoreVertical, Send, Image as ImageIcon, X, CornerUpLeft, Check } from "lucide-react";
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
    updateDoc,
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
    const [reactionPickerId, setReactionPickerId] = useState<string | null>(null);
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
        const checkDarkMode = () => setIsDark(document.documentElement.classList.contains("dark"));
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
            const groupSnap = await getDocs(query(collection(db, "groups"), where("__name__", "==", selectedUser)));
            if (!groupSnap.empty) {
                setIsGroup(true);
                const data = groupSnap.docs[0].data();
                setFriendProfile({ name: data.name || "Group", avatar: data.avatar || "/team-fill.svg", status: "Group", members: data.members } as any);
                setRequestStatus("accepted");
                const membersData: any[] = [];
                for (const memberId of data.members) {
                    const memberSnap = await getDocs(query(collection(db, "users"), where("__name__", "==", memberId)));
                    if (!memberSnap.empty) membersData.push({ uid: memberId, name: memberSnap.docs[0].data().name });
                }
                setGroupMembers(membersData);
            } else {
                setIsGroup(false);
                unsubProfile = onSnapshot(doc(db, "users", selectedUser), (snap) => {
                    if (snap.exists()) {
                        const d = snap.data();
                        setFriendProfile(prev => ({
                            ...prev || { name: "User", avatar: "/user-fill.svg", status: "Offline" },
                            name: d.name || "User", avatar: d.avatar || "/user-fill.svg", lastSeen: d.lastSeen,
                            status: prev?.status === "Online" || prev?.status === "Offline" ? prev.status : (d.status || "Offline")
                        }));
                    }
                });
                unsubPresence = onValue(ref(rtdb, `presence/${selectedUser}`), (snap) => {
                    const d = snap.val();
                    if (d) setFriendProfile(prev => ({ ...prev || { name: "User", avatar: "/user-fill.svg", status: "Offline" }, status: d.status || "Offline", lastSeen: d.lastSeen ? { toDate: () => new Date(d.lastSeen) } : prev?.lastSeen }));
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
                const unreadBatch = writeBatch(db);
                let hasUnread = false;
                snapshot.forEach((snap) => {
                    const d = snap.data();
                    messages.unshift({ id: snap.id, ...d } as Message);
                    if (d.author !== currentUser && !d.read) { unreadBatch.update(doc(db, "messages", snap.id), { read: true }); hasUnread = true; }
                });
                if (hasUnread) { unreadBatch.commit().catch(err => console.error(err)); audioRef.current?.play().catch(() => {}); }
                setMessageList(messages);
            });
        };
        setupChat();
        return () => { unsubProfile?.(); unsubPresence?.(); unsubTyping?.(); unsubRequest?.(); unsubMessages?.(); if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current); };
    }, [selectedUser, currentUser, roomId, requestId, msgLimit]);

    const handleTyping = () => {
        if (requestStatus !== "accepted" || isGroup) return;
        const myTypingRef = ref(rtdb, `typing/${roomId}/${currentUser}`);
        if (!isTypingRef.current) { isTypingRef.current = true; set(myTypingRef, true); onDisconnect(myTypingRef).remove(); }
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => { isTypingRef.current = false; set(myTypingRef, false); }, 2000);
    };

    const sendMessage = async () => {
        if (currentMessage.trim() !== "" && requestStatus === "accepted") {
            const messageData: any = { roomId, author: currentUser, message: currentMessage.trim(), time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), timestamp: serverTimestamp() };
            if (replyTo) messageData.replyTo = { message: replyTo.message, author: replyTo.author };
            try { setCurrentMessage(""); setReplyTo(null); await addDoc(collection(db, "messages"), messageData); } catch (error) { console.error(error); }
        }
    };

    const deleteMessage = async (msgId: string) => { try { await deleteDoc(doc(db, "messages", msgId)); } catch (error) { console.error(error); } };
    const clearChat = async () => {
        setShowClearConfirm(false);
        try {
            const q = query(collection(db, "messages"), where("roomId", "==", roomId));
            const snap = await getDocs(q);
            const batch = writeBatch(db);
            snap.forEach(d => batch.delete(d.ref));
            await batch.commit();
        } catch (error) { console.error(error); }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || requestStatus !== "accepted") return;
        setIsUploading(true);
        try {
            const signRes = await fetch('/api/upload/sign');
            const { signature, timestamp, apiKey, cloudName } = await signRes.json();
            const formData = new FormData();
            formData.append("file", file);
            formData.append("api_key", apiKey);
            formData.append("timestamp", timestamp.toString());
            formData.append("signature", signature);
            const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: "POST", body: formData });
            const cloudinaryData = await uploadRes.json();
            const messageData = { roomId, author: currentUser, message: "Photo", imageUrl: cloudinaryData.secure_url, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), timestamp: serverTimestamp() };
            await addDoc(collection(db, "messages"), messageData);
        } catch (error) { console.error(error); } finally { setIsUploading(false); }
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            const chunks: BlobPart[] = [];
            mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
            mediaRecorder.onstop = () => { setAudioBlob(new Blob(chunks, { type: "audio/webm" })); stream.getTracks().forEach(track => track.stop()); };
            mediaRecorder.start();
            setIsRecording(true);
            setRecordingTime(0);
            recordingIntervalRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
        } catch (error) { console.error(error); alert("Microphone access denied."); }
    };

    const stopRecording = () => { if (mediaRecorderRef.current && isRecording) { mediaRecorderRef.current.stop(); setIsRecording(false); clearInterval(recordingIntervalRef.current!); } };
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
            formData.append("resource_type", "video");
            const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, { method: "POST", body: formData });
            const cloudinaryData = await uploadRes.json();
            const messageData = { roomId, author: currentUser, message: "Voice Message", audioUrl: cloudinaryData.secure_url, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), timestamp: serverTimestamp() };
            await addDoc(collection(db, "messages"), messageData);
            setAudioBlob(null);
        } catch (error) { console.error(error); } finally { setIsUploading(false); }
    };

    const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;
    const onEmojiClick = (emojiData: any) => setCurrentMessage(prev => prev + emojiData.emoji);
    
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => { if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) setShowEmojiPicker(false); };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    useEffect(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), [messageList]);

    const handleRequestAction = async (action: "accepted" | "declined") => {
        setIsActionLoading(true);
        try { await setDoc(doc(db, "chatRequests", requestId), { status: action }, { merge: true }); }
        catch (error) { console.error(error); } finally { setIsActionLoading(false); }
    };

    const sendRequest = async () => {
        setIsActionLoading(true);
        try { await setDoc(doc(db, "chatRequests", requestId), { from: currentUser, to: selectedUser, status: "pending", timestamp: serverTimestamp() }); }
        catch (error) { console.error(error); } finally { setIsActionLoading(false); }
    };

    const handleReaction = async (messageId: string, emoji: string) => {
        try {
            const msgRef = doc(db, "messages", messageId);
            await updateDoc(msgRef, {
                reaction: emoji
            });
            setReactionPickerId(null);
        } catch (error) {
            console.error("Error adding reaction:", error);
        }
    };

    const commonEmojis = ["❤️", "👍", "🔥", "😂", "😮", "😢"];

    return (
        <div className="w-full h-full flex flex-col overflow-hidden relative bg-surface">
            {lightboxUrl && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-fadeIn" onClick={() => setLightboxUrl(null)}>
                    <button className="absolute top-4 right-5 text-white/70 hover:text-white text-3xl font-light z-10" onClick={() => setLightboxUrl(null)}>✕</button>
                    <div className="relative max-w-[90vw] max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
                        <img src={lightboxUrl} alt="Photo" className="rounded-xl shadow-2xl" />
                    </div>
                </div>
            )}
            
            <header className="h-16 w-full bg-surface-elevated flex items-center px-3 md:px-6 sticky top-0 z-50 shadow-md border-b border-border">
                {!isSearching ? (
                    <>
                        <button onClick={() => setSelectedUser(null)} className="md:hidden p-2 -ml-2 hover:bg-white/5 rounded-xl transition-colors">
                            <ChevronLeft size={24} className="text-text-muted" />
                        </button>
                        <div className="flex items-center gap-2.5 md:gap-3.5 animate-fadeIn min-w-0">
                            <div className={`w-9 h-9 md:w-10 md:h-10 rounded-xl md:rounded-2xl overflow-hidden shadow-md ring-2 ring-transparent group-hover:ring-primary/20 transition-all bg-sidebar-surface flex-shrink-0 flex items-center justify-center ${(!friendProfile?.avatar || friendProfile.avatar === "") ? "bg-gradient-to-tr from-primary/20 to-accent/20 border border-primary/20" : ""}`}>
                                {friendProfile?.avatar ? (
                                    <Image 
                                        src={friendProfile.avatar} 
                                        alt="Avatar" 
                                        width={40} 
                                        height={40} 
                                        className="w-full h-full object-cover" 
                                    />
                                ) : (
                                    <span className="text-primary font-black text-lg md:text-xl tracking-tighter drop-shadow-sm select-none">
                                        {(friendProfile?.name || "U").charAt(0).toUpperCase()}
                                    </span>
                                )}
                            </div>
                            <div className="flex flex-col">
                                <div className="flex items-center gap-2">
                                    <p className="font-bold text-[16px] text-text-primary tracking-tight leading-none">{friendProfile?.name || "Loading..."}</p>
                                    {!isGroup && friendProfile?.status === "Online" && (
                                        <div className="w-2 h-2 bg-accent rounded-full animate-pulse-cyan shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
                                    )}
                                </div>
                                <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mt-1 opacity-70">
                                    {isGroup ? `${friendProfile?.members?.length} Members` : (friendTyping ? "Typing..." : friendProfile?.status || "Offline")}
                                </p>
                            </div>
                        </div>
                        <div className="ml-auto flex gap-4 text-text-muted items-center animate-fadeIn">
                            <button className="p-2 hover:bg-white/5 rounded-xl transition-all hover:text-primary"><Video size={20} className="opacity-60" /></button>
                            <button className="p-2 hover:bg-white/5 rounded-xl transition-all hover:text-primary"><Phone size={20} className="opacity-60" /></button>
                            <button onClick={() => setIsSearching(true)} className="p-2 hover:bg-white/5 rounded-xl transition-all hover:text-primary"><Search size={20} className="opacity-60" /></button>
                            <div className="relative">
                                <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 hover:bg-white/5 rounded-xl transition-all hover:text-primary"><MoreVertical size={20} className="opacity-60" /></button>
                                {isMenuOpen && (
                                    <div className="absolute right-0 mt-2 w-48 bg-surface-elevated rounded-2xl shadow-2xl border border-border py-2 z-[100] animate-scaleIn">
                                        <button onClick={() => {setIsMenuOpen(false); setShowClearConfirm(true);}} className="w-full text-left px-4 py-3 text-sm text-error hover:bg-error/5 font-semibold transition-colors flex items-center gap-3">
                                            <Trash2 size={18} className="opacity-70" /> Clear Chat
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="w-full flex items-center gap-4 animate-fadeIn">
                        <button onClick={() => {setIsSearching(false); setMessageSearchQuery("");}} className="p-2 hover:bg-white/5 rounded-xl transition-colors text-text-muted"><ChevronLeft size={24} /></button>
                        <div className="flex-1 bg-input-surface rounded-2xl px-4 py-2 border border-border flex items-center gap-3 focus-within:ring-2 focus-within:ring-accent/10 transition-all">
                            <Search size={18} className="opacity-40" />
                            <input type="text" placeholder="Search in chat..." autoFocus className="bg-transparent border-none outline-none w-full text-sm font-medium text-text-primary placeholder:text-text-muted" value={messageSearchQuery} onChange={(e) => setMessageSearchQuery(e.target.value)} />
                            {messageSearchQuery && <button onClick={() => setMessageSearchQuery("")} className="text-text-muted hover:text-text-primary">✕</button>}
                        </div>
                    </div>
                )}
            </header>

            <main className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-4 relative custom-scrollbar">
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: "url('/backgroundforchat.jpg')", backgroundSize: "400px" }} />
                <div className="relative z-10 flex flex-col gap-4">
                    {requestStatus === "accepted" ? (
                        <>
                            {messageList.length >= msgLimit && (
                                <div className="flex justify-center mb-4">
                                    <button onClick={() => setMsgLimit(prev => prev + 50)} className="text-[10px] font-bold uppercase tracking-widest px-6 py-2 bg-input-surface text-primary border border-border rounded-full shadow-lg hover:scale-105 transition-all">Load older messages</button>
                                </div>
                            )}
                            {messageList.filter(msg => msg.message.toLowerCase().includes(messageSearchQuery.toLowerCase())).map((msg, index) => {
                                const isGrouped = index > 0 && messageList[index-1].author === msg.author;
                                const isMe = msg.author === currentUser;
                                return (
                                    <div key={msg.id || index} className={`flex flex-col animate-slideUpFade ${isGrouped ? "mt-1" : "mt-6"} ${isMe ? "items-end" : "items-start"}`}>
                                        <div className="flex items-end gap-3 max-w-[85%] sm:max-w-[70%] relative">
                                            {!isMe && !isGrouped && (
                                                <div className="w-8 h-8 rounded-xl overflow-hidden shadow-md border border-border flex-shrink-0 mb-1">
                                                    <Image src={groupMembers.find(m => m.uid === msg.author)?.avatar || friendProfile?.avatar || "/user-fill.svg"} alt="Author" width={32} height={32} />
                                                </div>
                                            )}
                                            {!isMe && isGrouped && <div className="w-8 shrink-0" />}
                                            <div className={`relative group/bubble transition-all duration-200 px-4 py-2.5 rounded-2xl shadow-sm ${
                                                isMe ? 'bg-primary text-white ' + (isGrouped ? 'rounded-tr-lg' : 'rounded-tr-none') : 'bg-surface-elevated border border-border text-text-secondary ' + (isGrouped ? 'rounded-tl-lg' : 'rounded-tl-none')
                                            }`}>
                                                {msg.replyTo && (
                                                    <div className={`mb-2 p-2 rounded-xl text-[11px] border-l-4 ${isMe ? 'bg-white/10 border-white/50 text-white/90' : 'bg-black/5 dark:bg-white/5 border-primary/50 text-text-muted'}`}>
                                                        <p className="font-bold mb-0.5">{msg.replyTo?.author === currentUser ? "You" : (groupMembers.find(m => m.uid === msg.replyTo?.author)?.name || friendProfile?.name)}</p>
                                                        <p className="line-clamp-2 opacity-70 italic">"{msg.replyTo?.message}"</p>
                                                    </div>
                                                )}
                                                {msg.imageUrl ? (
                                                    <div className="relative w-48 h-48 sm:w-64 sm:h-64 rounded-xl overflow-hidden mb-1 cursor-zoom-in group/img" onClick={() => setLightboxUrl(msg.imageUrl!)}>
                                                        <Image src={msg.imageUrl} alt="Image" fill className="object-cover group-hover/img:scale-105 transition-transform" />
                                                        <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/20 flex items-center justify-center transition-colors"><Search className="text-white opacity-0 group-hover/img:opacity-100" size={24} /></div>
                                                    </div>
                                                ) : msg.audioUrl ? (
                                                    <VoiceMessage audioUrl={msg.audioUrl} isMe={isMe} />
                                                ) : <p className="text-[14.5px] font-medium leading-relaxed break-words">{msg.message}</p>}
                                                <div className={`flex items-center gap-2 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                    <span className={`text-[9px] font-bold uppercase tracking-widest opacity-60 ${isMe ? 'text-white/80' : 'text-text-muted'}`}>{msg.time}</span>
                                                    {isMe && <span className="text-[10px] text-white/90">{msg.read ? '✓✓' : '✓'}</span>}
                                                </div>
                                                <div className={`absolute top-0 opacity-0 group-hover/bubble:opacity-100 flex items-center gap-1.5 transition-all z-10 ${isMe ? '-left-24' : '-right-24'}`}>
                                                    <div className="relative">
                                                        <button onClick={() => setReactionPickerId(reactionPickerId === msg.id ? null : msg.id!)} className="p-2 bg-surface-elevated border border-border rounded-full hover:text-primary transition-all hover:scale-110 shadow-sm"><Smile size={14} /></button>
                                                        {reactionPickerId === msg.id && (
                                                            <div className={`absolute bottom-full mb-2 bg-surface-elevated border border-border rounded-2xl p-1.5 flex gap-1 shadow-2xl animate-scaleIn z-[100] ${isMe ? 'right-0' : 'left-0'}`}>
                                                                {commonEmojis.map(emoji => (
                                                                    <button key={emoji} onClick={() => handleReaction(msg.id!, emoji)} className="text-xl hover:scale-125 transition-transform p-1">
                                                                        {emoji}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <button onClick={() => setReplyTo(msg)} className="p-2 bg-surface-elevated border border-border rounded-full hover:text-primary transition-all hover:scale-110 shadow-sm"><CornerUpLeft size={14} /></button>
                                                    <button onClick={() => deleteMessage(msg.id!)} className="p-2 bg-surface-elevated border border-border rounded-full hover:text-error transition-all hover:scale-110 shadow-sm"><Trash2 size={14} /></button>
                                                </div>
                                                {msg.reaction && (
                                                    <div className={`absolute bottom-[-10px] ${isMe ? 'right-0' : 'left-0'} animate-bounceIn`}>
                                                        <div className="bg-surface-elevated border border-border rounded-full px-1.5 py-0.5 shadow-md flex items-center gap-1 text-sm filter drop-shadow-sm">
                                                            <span>{msg.reaction}</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center py-20">
                            <div className="w-20 h-20 bg-input-surface rounded-3xl border border-border flex items-center justify-center mb-6 shadow-xl"><Image src="/user-shared-2-fill.svg" alt="Auth" width={40} height={40} className="opacity-40 dark:invert" /></div>
                            <h2 className="text-2xl font-black text-text-primary tracking-tight mb-2">Connect with {friendProfile?.name}</h2>
                            <p className="text-text-secondary max-w-xs mb-8">Start the conversation securely.</p>
                            {requestStatus === "pending" ? (
                                <button disabled className="px-8 py-4 bg-input-surface text-text-muted font-bold rounded-2xl border border-border flex items-center gap-3"><div className="w-4 h-4 border-2 border-t-text-muted rounded-full animate-spin" /> Pending...</button>
                            ) : requestStatus === "pending" && requestSender !== currentUser ? (
                                <div className="flex gap-4"><button onClick={() => handleRequestAction("declined")} className="px-6 py-3 font-bold text-text-secondary hover:bg-white/5 rounded-xl">Decline</button><button onClick={() => handleRequestAction("accepted")} className="px-8 py-3 font-bold text-white bg-primary rounded-xl shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all">Accept Request</button></div>
                            ) : <button onClick={sendRequest} disabled={isActionLoading} className="px-10 py-4 bg-primary text-white font-bold rounded-2xl shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all">{isActionLoading ? "Loading..." : "Send Chat Request"}</button>}
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </main>

            {requestStatus === "accepted" && (
                <footer className="p-4 bg-surface border-t border-border relative z-10">
                    {isRecording ? (
                        <div className="flex items-center gap-4 bg-input-surface px-6 py-4 rounded-3xl border border-border shadow-2xl animate-slideUp">
                            <div className="flex items-center gap-3 flex-1"><div className="w-3 h-3 bg-error rounded-full animate-pulse" /><span className="text-sm font-bold text-text-primary">Recording Voice... {formatTime(recordingTime)}</span></div>
                            <button onClick={stopRecording} className="p-3 bg-error/10 text-error hover:bg-error/20 rounded-2xl transition-all"><Square size={20} fill="currentColor" /></button>
                        </div>
                    ) : audioBlob ? (
                        <div className="flex items-center gap-4 bg-input-surface px-6 py-4 rounded-3xl border border-border shadow-2xl animate-slideUp">
                            <div className="flex-1 flex flex-col gap-1"><span className="text-[10px] font-bold text-primary uppercase tracking-widest">Voice Recorded</span><p className="text-sm font-medium text-text-primary">Ready to send</p></div>
                            <div className="flex gap-2"><button onClick={() => setAudioBlob(null)} className="p-3 text-text-muted hover:bg-white/5 rounded-2xl">Discard</button><button onClick={sendAudioMessage} className="p-3 bg-primary text-white rounded-2xl shadow-lg shadow-primary/30 hover:scale-105 active:scale-95 transition-all">{isUploading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send size={20} />}</button></div>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {replyTo && (
                                <div className="bg-input-surface p-3 pr-4 rounded-2xl border-l-4 border-primary flex items-center justify-between animate-slideUpFade">
                                    <div className="flex flex-col gap-0.5"><span className="text-[10px] font-bold text-primary uppercase tracking-widest">Replying to {replyTo.author === currentUser ? 'yourself' : friendProfile?.name}</span><p className="text-xs text-text-secondary line-clamp-1 italic">"{replyTo.message}"</p></div>
                                    <button onClick={() => setReplyTo(null)} className="p-1 text-text-muted hover:text-text-primary"><X size={18} /></button>
                                </div>
                            )}
                            <div className="flex items-end gap-3">
                                <div className="flex-1 bg-input-surface rounded-3xl border border-border shadow-sm focus-within:shadow-lg focus-within:border-accent/40 focus-within:ring-4 focus-within:ring-accent/5 transition-all duration-300">
                                    <textarea className="w-full bg-transparent border-none outline-none px-5 py-4 text-[15px] font-medium text-text-primary placeholder:text-text-muted/60 resize-none min-h-[56px] max-h-[150px] custom-scrollbar" placeholder="Type a message..." rows={1} value={currentMessage} onChange={(e) => { setCurrentMessage(e.target.value); handleTyping(); }} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }} />
                                    <div className="flex items-center justify-between px-3 pb-3">
                                        <div className="flex items-center gap-1">
                                            <div className="relative" ref={emojiRef}><button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="p-2 text-text-muted hover:text-primary transition-colors hover:bg-white/5 rounded-xl"><Smile size={20} /></button>
                                            {showEmojiPicker && <div className="absolute bottom-14 left-0 z-[100] animate-slideUp"><EmojiPicker theme={isDark ? Theme.DARK : Theme.LIGHT} onEmojiClick={onEmojiClick} /></div>}</div>
                                            <button onClick={() => fileInputRef.current?.click()} className="p-2 text-text-muted hover:text-primary transition-colors hover:bg-white/5 rounded-xl"><ImageIcon size={20} /></button>
                                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                                            <button onClick={startRecording} className="p-2 text-text-muted hover:text-primary transition-colors hover:bg-white/5 rounded-xl"><Mic size={20} /></button>
                                        </div>
                                        <button onClick={sendMessage} disabled={!currentMessage.trim() && !isUploading} className={`p-3 bg-primary text-white rounded-2xl shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:grayscale disabled:scale-100 ${currentMessage.trim() ? 'shadow-primary/30 hover:scale-105' : 'shadow-none'}`}>{isUploading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send size={20} />}</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </footer>
            )}

            {showClearConfirm && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-surface-elevated border border-border rounded-2xl p-6 shadow-2xl max-w-sm w-full mx-4 flex flex-col gap-4">
                        <h3 className="text-xl font-bold text-text-primary">Clear Chat?</h3>
                        <p className="text-sm text-text-secondary">Are you sure you want to clear this entire chat? This action cannot be undone.</p>
                        <div className="flex gap-3 justify-end mt-2">
                            <button onClick={() => setShowClearConfirm(false)} className="px-4 py-2 rounded-xl text-sm font-semibold text-text-muted hover:bg-white/5 transition-colors">Cancel</button>
                            <button onClick={clearChat} className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-error hover:bg-red-600 transition-colors shadow-sm">Clear Chat</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Messages;
