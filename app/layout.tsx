import { Poppins } from "next/font/google";
import type { Metadata } from "next";

import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  fallback: [
    "Apple Color Emoji",
    "Segoe UI Emoji",
    "Noto Color Emoji"
  ],
});

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
      <body className={`${poppins.className} font-sans`}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
