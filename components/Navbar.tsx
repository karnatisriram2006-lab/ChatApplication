import Image from "next/image"; 
import Messages from "./Messages";
import Content from "./Content";
const Navbar = () => {
    return (
        <>
        <header className="flex h-screen">
        <nav className="h-12 w-75 bg-white border-b border-gray-200">
            <section className="flex items-center ">
                <div className="h-12 w-100 px-4 flex items-center justify-between">
                    <div>Chat App</div>
                    <div className="flex gap-4">
                        <Image src="/team-fill.svg" alt="Team" width={20} height={20} /> 
                        <Image src="/settings-4-fill.svg" alt="Settings" width={20} height={20} />  
                        <Image src="/chat-1-fill.svg" alt="Chat" width={20} height={20} />  
                        <Image src="/more-2-fill.svg" alt="More" width={20} height={20} />
                         </div>
                </div>
                
            </section>  
            <Content/>
        </nav>
        <Messages/>
        </header>
        
        </>
    )
}
export default Navbar;