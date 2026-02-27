import Image from "next/image";

const Chats = () => {
    return (
        <section className="p-4 mt-2 flex w-full h-10 items-center justify-between">
            <div className="flex items-center gap-2">
            <Image src="/sriram.jpeg" alt="Sriram" width={40} height={40} className="rounded-full"/>
            <div className="flex flex-col">
                <p className="font-semibold">Sriram</p>
                <p className="text-xs">Online</p>
            </div>
            </div>
            <div className="flex items-center gap-2">
                <p className="text-xs">10:00 AM</p>
                
            </div>
        </section>
    )
}
export default Chats;