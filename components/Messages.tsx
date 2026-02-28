"use client";

import { useState, useRef } from "react";
import EmojiPicker, { Theme } from "emoji-picker-react";
import { Smile } from "lucide-react";
import Image from "next/image";
import { useEffect } from "react";
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
    reaction?: string;
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
    const [friendProfile, setFriendProfile] = useState<{ name: string; avatar: string; status: string; lastSeen?: any } | null>(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [friendTyping, setFriendTyping] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const emojiRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const isTypingRef = useRef(false);
    const [msgLimit, setMsgLimit] = useState(50);
    const [isDark, setIsDark] = useState(false);

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
   
    const roomId = [currentUser, selectedUser!].sort().join("_");
    const requestId = roomId;

    useEffect(() => {
        if (!currentUser || !selectedUser) return;

        const userRef = doc(db, "users", selectedUser);
        const userUnsubscribe = onSnapshot(userRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setFriendProfile({
                    name: data.name || "User",
                    avatar: data.avatar || "/user-fill.svg",
                    status: data.status || "Offline",
                    lastSeen: data.lastSeen
                });
            }
        });

        const presenceRef = ref(rtdb, `presence/${selectedUser}`);
        const presenceUnsubscribe = onValue(presenceRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                setFriendProfile(prev => prev ? {
                    ...prev,
                    status: data.status || "Offline",
                    lastSeen: data.lastSeen ? { toDate: () => new Date(data.lastSeen) } : prev.lastSeen
                } : null);
            }
        });

        const typingRef = ref(rtdb, `typing/${roomId}/${selectedUser}`);
        const typingUnsubscribe = onValue(typingRef, (snapshot) => {
            setFriendTyping(!!snapshot.val());
        });

        const requestUnsubscribe = onSnapshot(doc(db, "chatRequests", requestId), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setRequestStatus(data.status);
                setRequestSender(data.from);
            } else {
                setRequestStatus(null);
                setRequestSender(null);
            }
        });

        const q = query(collection(db, "messages"), where("roomId", "==", roomId), orderBy("timestamp", "desc"), limit(msgLimit));
        const messageUnsubscribe = onSnapshot(q, (snapshot) => {
            const messages: Message[] = [];
            const unreadBatch = writeBatch(db);
            let hasUnread = false;

            snapshot.forEach((docSnap) => {
                const msgData = docSnap.data();
                messages.unshift({ id: docSnap.id, ...msgData } as Message);

                if (msgData.author !== currentUser && !msgData.read) {
                    unreadBatch.update(doc(db, "messages", docSnap.id), { read: true });
                    hasUnread = true;
                }
            });

            if (hasUnread) {
                unreadBatch.commit().catch(err => console.error("Error marking read:", err));
                if (audioRef.current) {
                    audioRef.current.play().catch(e => console.log("Audio play prevented:", e));
                }
            }
            setMessageList(messages);
        });
        
        return () => {
            userUnsubscribe();
            presenceUnsubscribe();
            typingUnsubscribe();
            requestUnsubscribe();
            messageUnsubscribe();
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        };
    }, [roomId, currentUser, selectedUser, requestId, msgLimit]);

    const handleTyping = () => {
        if (requestStatus !== "accepted") return;
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
        // Only auto-scroll to bottom if we are on the first load, OR if a brand new message just came in.
        // If we "Loaded More", the array length jumped by > 1, so don't auto-scroll.
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
            const messageData = {
                roomId: roomId, author: currentUser, message: currentMessage.trim(),
                time: new Date(Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                timestamp: serverTimestamp(),
            };
            try {
                setCurrentMessage("");
                await addDoc(collection(db, "messages"), messageData);
            } catch (error) { console.error("Error sending message: ", error); }
        }
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
            
            <section className="h-16 w-full bg-white/80 dark:bg-gray-950/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 flex items-center px-4 sticky top-0 z-10 shadow-sm gap-2">
                <button onClick={() => setSelectedUser(null)} className="md:hidden p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">
                    <Image src="/chevron-left.svg" alt="Back" width={24} height={24} className="dark:invert" />
                </button>
                <div className="flex items-center gap-3">
                    <Image src={friendProfile?.avatar || "/user-fill.svg"} alt={friendProfile?.name || "User Profile"} width={45} height={45} className="rounded-full shadow-sm bg-white dark:bg-gray-900" />
                    <div className="flex flex-col">
                        <p className="font-bold text-gray-800 dark:text-gray-100">{friendProfile?.name || "Loading..."}</p>
                        {friendTyping ? (
                            <p className="text-[11px] font-medium text-blue-500 dark:text-blue-400 animate-pulse">typing...</p>
                        ) : (
                            <p className={`text-[11px] font-medium ${friendProfile?.status === "Online" ? "text-green-500 dark:text-emerald-400" : "text-gray-400 dark:text-gray-500"}`}>
                                {friendProfile?.status === "Online" ? "🟢 Active now" : (<>⚫ Last seen {friendProfile?.lastSeen?.toDate ? friendProfile.lastSeen.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : "recently"}</>)}
                            </p>
                        )}
                    </div>
                </div>
                <div className="ml-auto flex gap-5 text-gray-400 dark:text-gray-500 items-center">
                    <Image src="/video-on-fill.svg" alt="Video" width={22} height={22} className="cursor-pointer hover:text-blue-500 transition-colors dark:invert" />
                    <Image src="/phone-fill.svg" width={22} height={22} alt="Call" className="dark:invert" />
                    <Image src="/search-line.svg" alt="Search" width={22} height={22} className="cursor-pointer hover:text-blue-500 transition-colors dark:invert" />
                    <div className="relative">
                        <Image src="/more-2-fill.svg" alt="More" width={22} height={22} className="cursor-pointer hover:text-blue-500 transition-colors dark:invert" onClick={() => setIsMenuOpen(!isMenuOpen)} />
                        {isMenuOpen && (
                            <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-100 dark:border-gray-800 py-1 z-50">
                                <button onClick={() => {setIsMenuOpen(false); setShowClearConfirm(true);}} className="w-full text-left px-4 py-2.5 text-sm text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 font-medium transition-colors flex items-center gap-2">
                                    <Image src="/chat-delete-fill.svg" alt="Clear" width={16} height={16} className="opacity-70 dark:invert" /> Clear Chat
                                </button>
                            </div>
                        )}
                    </div>
                </div>
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
                        <section className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 bg-gray-50/10 dark:bg-gray-950/50">
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
                            {messageList.map((msg, index) => (
                                <div key={msg.id || index} className={`flex flex-col group ${msg.author === currentUser ? "items-end" : "items-start"}`}>
                                    <div className="flex items-center gap-2 max-w-[75%]">
                                        {msg.author === currentUser && (
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                                <button onClick={() => msg.id && handleReaction(msg.id, "❤️")} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-lg leading-none" title="React with Heart">❤️</button>
                                                <button onClick={() => msg.id && deleteMessage(msg.id)} className="p-1 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg text-red-500 dark:text-red-400" title="Delete message"><Image src="/close-circle-fill.svg" alt="Delete" width={14} height={14} className="opacity-60" /></button>
                                            </div>
                                        )}
                                        {msg.author !== currentUser && (
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all order-last">
                                                <button onClick={() => msg.id && handleReaction(msg.id, "❤️")} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-lg leading-none" title="React with Heart">❤️</button>
                                            </div>
                                        )}
                                        <div className={`relative p-3.5 rounded-2xl text-[13px] leading-[1.5] shadow-sm ${msg.author === currentUser ? "bg-blue-600 text-white rounded-br-none" : "bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-gray-700 rounded-bl-none"}`}>
                                            {msg.imageUrl ? (
                                                <div className="relative w-48 h-48 sm:w-60 sm:h-60 rounded-xl overflow-hidden mb-1 cursor-pointer group/img" onClick={() => setLightboxUrl(msg.imageUrl!)}>
                                                    <Image src={msg.imageUrl} alt="Uploaded photo" fill className="object-cover transition-transform group-hover/img:scale-105" />
                                                    <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/20 transition-colors flex items-center justify-center"><span className="text-white text-2xl opacity-0 group-hover/img:opacity-100 transition-opacity drop-shadow">🔍</span></div>
                                                </div>
                                            ) : (<p className="leading-snug align-middle">{msg.message}</p>)}
                                            {msg.reaction && (<div className={`absolute -bottom-3 ${msg.author === currentUser ? '-left-2' : '-right-2'} bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-full px-1.5 shadow-sm text-sm select-none`}>{msg.reaction}</div>)}
                                            <p className={`flex items-center gap-1 text-[9px] mt-1.5 font-medium ${msg.author === currentUser ? "text-blue-100 justify-end" : "text-gray-400 dark:text-gray-500"}`} title={msg.timestamp ? msg.timestamp.toDate().toLocaleString() : msg.time}>
                                                {msg.time}
                                                {msg.author === currentUser && (<span className="text-[10px] ml-0.5">{msg.read ? "✓✓" : "✓"}</span>)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </section>

                        <section className="p-3 sm:p-4 pb-[env(safe-area-inset-bottom,12px)] bg-white/50 dark:bg-gray-950/50 backdrop-blur-md border-t border-gray-100 dark:border-gray-800">
                            {showEmojiPicker && (
                                <div ref={emojiRef} className="absolute bottom-20 left-4 z-50 animate-fadeIn">
                                    <EmojiPicker onEmojiClick={onEmojiClick} theme={isDark ? Theme.DARK : Theme.LIGHT} height={350} width={300} />
                                </div>
                            )}
                            <div className="flex items-center mb-2 gap-3 bg-gray-100/80 dark:bg-gray-900/80 rounded-2xl px-4 py-2.5 border border-gray-200/50 dark:border-gray-800/50">
                                <button onClick={() => setShowEmojiPicker((prev) => !prev)} className="hover:scale-110 transition-transform flex-shrink-0">
                                    <Smile size={22} className="text-gray-500 dark:text-gray-400" />
                                </button>
                                <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageUpload} />
                                <button onClick={() => fileInputRef.current?.click()} className="hover:scale-110 transition-transform flex-shrink-0 opacity-60">
                                    <Image src="/add-large-fill.svg" alt="Attach Image" width={22} height={22} className="dark:invert" />
                                </button>
                                <input
                                    type="text" placeholder={`Message ${friendProfile?.name}...`}
                                    className="flex-1 w-full min-w-0 bg-transparent border-none outline-none text-sm py-1 font-medium placeholder:text-gray-400 dark:placeholder:text-gray-500 text-gray-800 dark:text-gray-100"
                                    value={currentMessage} onChange={(e) => { setCurrentMessage(e.target.value); handleTyping(); }}
                                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                                />
                                <button onClick={sendMessage} className={`p-2 rounded-xl transition-all flex-shrink-0 ${currentMessage.trim() ? "bg-blue-600 shadow-md shadow-blue-200 dark:shadow-blue-900 scale-100" : "bg-gray-300 dark:bg-gray-700 scale-95"}`} disabled={!currentMessage.trim() && !isUploading}>
                                    {isUploading ? (<div className="w-4 h-4 rounded-full border-2 border-white/50 border-t-white animate-spin m-0.5"></div>) : (<Image src="/send-plane-fill.svg" alt="Send" width={18} height={18} className="brightness-0 invert dark:brightness-[100]" />)}
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
