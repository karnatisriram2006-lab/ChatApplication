import { DM_Sans, Space_Grotesk  } from "next/font/google";
import type { Metadata } from "next";

import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";


const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400","500","700"]
})

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-heading",
  weight: ["400","500","600","700"]
})

export const metadata: Metadata = {
  title: "ChatApp — Private Messaging",
  description: "Secure, real-time private chat powered by Firebase.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{
          __html: `
            if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
              document.documentElement.classList.add('dark')
            } else {
              document.documentElement.classList.remove('dark')
            }
          `
        }} />
      </head>
      <body className={`${dmSans.className} ${spaceGrotesk.className} font-sans`}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
