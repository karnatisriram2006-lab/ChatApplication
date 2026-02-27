import Image from "next/image";
import Chats from "./Chats";

const Content = () => {
    return (
        <aside className="h-screen w-75 bg-white flex flex-col items-center">
            <div className="flex items-center justify-between bg-gray-100 h-10 w-70 rounded-2xl">
                <Image src="/search-line.svg" alt="Search" width={20} height={20} className="ml-2"/>
                <input type="text" placeholder="Search" className="px-2 bg-gray-100 border-none rounded-lg outline-none"/>
            </div>
            <Chats/>
            <Chats/>
            <Chats/>
            <Chats/>
            <Chats/>
            <Chats/>
            
        </aside>
    )
}
export default Content;