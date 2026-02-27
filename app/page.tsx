import Image from "next/image";
import Navbar from "@/components/Navbar";
import Content from "@/components/Content";
import Messages from "@/components/Messages";


export default function Home() {
  return (
    <div>
      <Image
        alt="Mountains background"
        src="/backgroundimage.jpg"
        quality={100}
        
        fill // Makes image fill parent
        style={{
          objectFit: 'cover', // Ensures image covers the area
          zIndex: -1, // Places the image behind other content
        }}
      />

     <Navbar/>
     
     
    </div>
  );
}
