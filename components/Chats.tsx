import Image from "next/image";

interface ChatsProps {
    name: string;
    status: string;
    time: string;
    avatar: string;
    isActive: boolean;
    onClick: () => void;
}

const Chats = ({ name, status, time, avatar, isActive, onClick }: ChatsProps) => {
    return (
        <section 
            onClick={onClick}
            className={`p-4 flex w-full h-16 items-center justify-between cursor-pointer transition-all hover:bg-gray-50/50 ${
                isActive ? "bg-blue-50/50 border-r-4 border-blue-500" : ""
            }`}
        >
            <div className="flex items-center gap-3">
                <div className="relative">
                    <Image src={avatar} alt={name} width={45} height={45} className="rounded-full border border-gray-100 shadow-sm"/>
                    {status === "Online" && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                    )}
                </div>
                <div className="flex flex-col">
                    <p className={`font-semibold text-sm ${isActive ? "text-blue-700" : "text-gray-800"}`}>{name}</p>
                    <p className="text-[10px] text-gray-500 leading-tight">{status}</p>
                </div>
            </div>
            <div className="flex flex-col items-end gap-1">
                <p className="text-[10px] text-gray-400">{time}</p>
                {/* Could add unread badge here */}
            </div>
        </section>
    )
}

export default Chats;
