import Image from "next/image";

const Messages = () => {
    return (
        <div className=" w-full flex flex-col justify-between">
        <section className="h-12 w-full bg-white border-b border-gray-200 position-relative top-0">
           <div className="h-12 w-full flex items-center gap-2 justify-between">
                    <div className="flex items-center gap-2">
                    <Image src="/sriram.jpeg" alt="User" width={40} height={40} className="rounded-full"/>
                    <div className="flex flex-col">
                        <p className="font-semibold">Sriram</p>
                        <p className="text-xs">Online</p>
                    </div>
                    </div>
                    <div className="flex gap-4 mr-10">
                    <Image src="/video-on-fill.svg" alt="Video" width={20} height={20} />
                    <Image src="/phone-fill.svg" alt="Phone" width={20} height={20} />
                    <Image src="/search-line.svg" alt="Search" width={20} height={20} />
                    <Image src="/more-2-fill.svg" alt="More" width={20} height={20} />
                    </div>
                </div>
        </section>
        <section className="h-10 w-full bg-gray-100 rounded-2xl flex items-center justify-center">
            <div className="flex items-center justify-between gap-2 w-full">
                <Image src="/emotion-fill.svg" alt="Emoji" width={20} height={20} className="ml-5" />
                <input type="text" placeholder="Type a message" className="px-2 bg-gray-100 border-none rounded-lg outline-none"/>
                <Image src="/send-plane-fill.svg" alt="Send" width={20} height={20} className="mr-5" />
            </div>
        </section>
        </div>
    )
}
export default Messages;