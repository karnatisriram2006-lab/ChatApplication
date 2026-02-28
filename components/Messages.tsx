"use client";
import { useState, useRef } from "react";
import EmojiPicker from "emoji-picker-react";
import { Smile } from "lucide-react";
import Image from "next/image";
import { useEffect } from "react";
import { db } from "@/lib/firebase";
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
    Timestamp 
} from "firebase/firestore";

interface Message {
    id?: string;
    roomId: string;
    author: string;
    message: string;
    time: string;
    timestamp?: Timestamp;
}

interface MessagesProps {
    currentUser: string;
    selectedUser: string;
}

const Messages = ({ currentUser, selectedUser }: MessagesProps) => {
    const [currentMessage, setCurrentMessage] = useState("");
    const [messageList, setMessageList] = useState<Message[]>([]);
    const [requestStatus, setRequestStatus] = useState<string | null>(null);
    const [requestSender, setRequestSender] = useState<string | null>(null);
    const [friendProfile, setFriendProfile] = useState<{ name: string; avatar: string } | null>(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const emojiRef = useRef<HTMLDivElement>(null);
    // Create a unique room ID for the conversation by sorting and joining IDs
    const roomId = [currentUser, selectedUser].sort().join("_");
    const requestId = roomId; // We can use the same unique ID for the request

    useEffect(() => {
        if (!currentUser || !selectedUser) return;

        // Fetch friend's profile info
        const userRef = doc(db, "users", selectedUser);
        const userUnsubscribe = onSnapshot(userRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setFriendProfile({
                    name: data.name || "User",
                    avatar: data.avatar || "/sriram.jpeg"
                });
            }
        });

        // Listen for chat request status
        const requestUnsubscribe = onSnapshot(doc(db, "chatRequests", requestId), (docSnap) => {
            if (docSnap.exists()) {
                setRequestStatus(docSnap.data().status);
                setRequestSender(docSnap.data().from);
            } else {
                setRequestStatus(null);
                setRequestSender(null);
            }
        });

        // Query messages for the current room, ordered by timestamp
        const q = query(
            collection(db, "messages"),
            where("roomId", "==", roomId),
            orderBy("timestamp", "asc")
        );

        // Set up real-time listener for messages
        const messageUnsubscribe = onSnapshot(q, (snapshot) => {
            const messages: Message[] = [];
            snapshot.forEach((doc) => {
                messages.push({ id: doc.id, ...doc.data() } as Message);
            });
            setMessageList(messages);
        });

        return () => {
            userUnsubscribe();
            requestUnsubscribe();
            messageUnsubscribe();
        };
    }, [roomId, currentUser, selectedUser, requestId]);
    const onEmojiClick = (emojiData: any) => {
    setCurrentMessage((prev) => prev + emojiData.emoji);
};
useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (
            emojiRef.current &&
            !emojiRef.current.contains(event.target as Node)
        ) {
            setShowEmojiPicker(false);
        }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
        document.removeEventListener("mousedown", handleClickOutside);
    };
}, []);
    const sendRequest = async () => {
        try {
            await setDoc(doc(db, "chatRequests", requestId), {
                from: currentUser,
                to: selectedUser,
                status: "pending",
                timestamp: serverTimestamp()
            });
        } catch (error) {
            console.error("Error sending request:", error);
        }
    };

    const handleRequestAction = async (action: "accepted" | "declined") => {
        try {
            await setDoc(doc(db, "chatRequests", requestId), {
                status: action
            }, { merge: true });
        } catch (error) {
            console.error(`Error ${action} request:`, error);
        }
    };

    const sendMessage = async () => {
        if (currentMessage.trim() !== "" && requestStatus === "accepted") {
            const messageData = {
                roomId: roomId,
                author: currentUser,
                message: currentMessage.trim(),
                time: new Date(Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                timestamp: serverTimestamp(),
            };

            try {
                setCurrentMessage(""); // Clear input early for better UX
                await addDoc(collection(db, "messages"), messageData);
            } catch (error) {
                console.error("Error sending message: ", error);
            }
        }
    };

    const deleteMessage = async (messageId: string) => {
        try {
            await deleteDoc(doc(db, "messages", messageId));
        } catch (error) {
            console.error("Error deleting message: ", error);
        }
    };

    const clearChat = async () => {
        if (!window.confirm("Are you sure you want to clear this entire chat? This cannot be undone.")) return;
        
        try {
            const q = query(collection(db, "messages"), where("roomId", "==", roomId));
            const snapshot = await getDocs(q);
            const batch = writeBatch(db);
            
            snapshot.forEach((doc) => {
                batch.delete(doc.ref);
            });
            
            await batch.commit();
            setIsMenuOpen(false);
        } catch (error) {
            console.error("Error clearing chat: ", error);
        }
    };

    return (
        <div className="w-full flex flex-col justify-between h-[calc(100vh-64px)] overflow-hidden">
            
            <section className="h-16 w-full bg-white/80 backdrop-blur-md border-b border-gray-100 flex items-center px-4 sticky top-0 z-10 shadow-sm">
                <div className="flex items-center gap-3">
                    <Image src={friendProfile?.avatar || "/sriram.jpeg"} alt={friendProfile?.name || "User Profile"} width={45} height={45} className="rounded-full shadow-sm" />
                    <div className="flex flex-col">
                        <p className="font-bold text-gray-800">{friendProfile?.name || "Loading..."}</p>
                        <p className="text-[11px] text-green-500 font-medium">
                            {requestStatus === "accepted" ? "Active now" : "Request needed"}
                        </p>
                    </div>
                </div>
                <div className="ml-auto flex gap-5 text-gray-400 items-center">
                    <Image src="/video-on-fill.svg" alt="Video" width={22} height={22} className="cursor-pointer hover:text-blue-500 transition-colors" />
                    <Image src="/phone-fill.svg" alt="Phone" width={22} height={22} className="cursor-pointer hover:text-blue-500 transition-colors" />
                    <Image src="/search-line.svg" alt="Search" width={22} height={22} className="cursor-pointer hover:text-blue-500 transition-colors" />
                    
                    <div className="relative">
                        <Image 
                            src="/more-2-fill.svg" 
                            alt="More" 
                            width={22} 
                            height={22} 
                            className="cursor-pointer hover:text-blue-500 transition-colors" 
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                        />
                        {isMenuOpen && (
                            <div className="absolute right-0 mt-2 w-40 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50">
                                <button 
                                    onClick={clearChat}
                                    className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 font-medium transition-colors flex items-center gap-2"
                                >
                                    <Image src="/chat-delete-fill.svg" alt="Clear" width={16} height={16} className="opacity-70" />
                                    Clear Chat
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            <div className="flex-1 flex flex-col overflow-hidden relative">
                {requestStatus === "accepted" ? (
                    <>
                        <section className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 bg-gray-50/10">
                            {messageList.length === 0 && (
                                <div className="flex-1 flex flex-col items-center justify-center opacity-20 pointer-events-none">
                                    <Image src="/message-2-fill.svg" alt="No messages" width={100} height={100} />
                                    <p className="mt-4 text-sm font-medium">Say hi to {friendProfile?.name}!</p>
                                </div>
                            )}
                            {messageList.map((msg, index) => (
                                <div
                                    key={msg.id || index}
                                    className={`flex flex-col group ${msg.author === currentUser ? "items-end" : "items-start"}`}
                                >
                                    <div className="flex items-center gap-2 max-w-[75%]">
                                        {msg.author === currentUser && (
                                            <button 
                                                onClick={() => msg.id && deleteMessage(msg.id)}
                                                className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-50 rounded-lg transition-all text-red-400"
                                                title="Delete message"
                                            >
                                                <Image src="/close-circle-fill.svg" alt="Delete" width={14} height={14} className="opacity-60" />
                                            </button>
                                        )}
                                        <div
                                            className={`p-3.5 rounded-2xl text-[13px] leading-[1.5] shadow-sm ${
                                                msg.author === currentUser 
                                                    ? "bg-blue-600 text-white rounded-br-none" 
                                                    : "bg-white text-gray-800 border border-gray-100 rounded-bl-none"
                                            }`}
                                        >
                                            <p className="leading-snug align-middle">{msg.message}</p>   
                                            <p className={`text-[9px] mt-1.5 font-medium ${msg.author === currentUser ? "text-blue-100 text-right" : "text-gray-400"}`}>
                                                {msg.time}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </section>

                        <section className="p-4 bg-white/50 backdrop-blur-md border-t border-gray-100">
                            {showEmojiPicker && (
        <div
            ref={emojiRef}
            className="absolute bottom-20 left-4 z-50 animate-fadeIn"
        >
            <EmojiPicker
                onEmojiClick={onEmojiClick}
                theme="light"
                height={350}
                width={300}
            />
        </div>
    )}
                            <div className="flex items-center gap-3 bg-gray-100/80 rounded-2xl px-4 py-2.5 border border-gray-200/50">
                                <button
            onClick={() => setShowEmojiPicker((prev) => !prev)}
            className="hover:scale-110 transition-transform"
        >
            <Image
                src="/emotion-fill.svg"
                alt="Emoji"
                width={22}
                height={22}
                className="opacity-60"
            />
        </button>
                                <input
                                    type="text"
                                    placeholder={`Message ${friendProfile?.name}...`}
                                    className="emoji-text flex-1 bg-transparent border-none outline-none text-sm py-1 font-medium placeholder:text-gray-400"
                                    value={currentMessage}
                                    onChange={(e) => setCurrentMessage(e.target.value)}
                                    onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                                />
                                <button 
                                    onClick={sendMessage} 
                                    className={`p-2 rounded-xl transition-all ${
                                        currentMessage.trim() ? "bg-blue-600 shadow-md shadow-blue-200 scale-100" : "bg-gray-300 scale-95"
                                    }`}
                                    disabled={!currentMessage.trim()}
                                >
                                    <Image src="/send-plane-fill.svg" alt="Send" width={18} height={18} className="invert brightness-0" />
                                </button>
                            </div>
                        </section>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-gray-50/50">
                        <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-6">
                            <Image src="/shield-user-fill.svg" alt="Privacy" width={40} height={40} className="text-blue-500 opacity-60" />
                        </div>
                        
                        {!requestStatus && (
                            <>
                                <h3 className="text-xl font-bold text-gray-800 mb-2">Connect with {friendProfile?.name}</h3>
                                <p className="text-sm text-gray-500 max-w-xs mb-8">
                                    You need to send a chat request before you can start messaging each other.
                                </p>
                                <button
                                    onClick={sendRequest}
                                    className="bg-blue-600 text-white font-semibold py-3 px-8 rounded-xl hover:bg-blue-700 transition shadow-lg shadow-blue-100"
                                >
                                    Send Chat Request
                                </button>
                            </>
                        )}

                        {requestStatus === "pending" && requestSender === currentUser && (
                            <>
                                <h3 className="text-xl font-bold text-gray-800 mb-2">Request Sent!</h3>
                                <p className="text-sm text-gray-500 max-w-xs">
                                    Waiting for {friendProfile?.name} to accept your chat request.
                                </p>
                                <div className="mt-8 px-6 py-2 bg-blue-50 text-blue-600 rounded-full text-xs font-bold uppercase tracking-wider">
                                    Pending Approval
                                </div>
                            </>
                        )}

                        {requestStatus === "pending" && requestSender !== currentUser && (
                            <>
                                <h3 className="text-xl font-bold text-gray-800 mb-2">New Chat Request</h3>
                                <p className="text-sm text-gray-500 max-w-xs mb-8">
                                    {friendProfile?.name} wants to start a private conversation with you.
                                </p>
                                <div className="flex gap-4 w-full max-w-xs">
                                    <button
                                        onClick={() => handleRequestAction("declined")}
                                        className="flex-1 bg-white border border-gray-200 text-gray-600 font-semibold py-3 rounded-xl hover:bg-gray-50 transition"
                                    >
                                        Decline
                                    </button>
                                    <button
                                        onClick={() => handleRequestAction("accepted")}
                                        className="flex-1 bg-blue-600 text-white font-semibold py-3 rounded-xl hover:bg-blue-700 transition shadow-md shadow-blue-100"
                                    >
                                        Accept
                                    </button>
                                </div>
                            </>
                        )}

                        {requestStatus === "declined" && (
                            <>
                                <h3 className="text-xl font-bold text-gray-800 mb-2">Request Unavailable</h3>
                                <p className="text-sm text-gray-500 max-w-xs">
                                    This chat request was declined or is no longer available.
                                </p>
                                <button
                                    onClick={sendRequest}
                                    className="mt-8 text-blue-600 font-bold hover:underline"
                                >
                                    Try sending again
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Messages;
