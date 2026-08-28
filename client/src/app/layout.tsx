import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { EnvironmentProvider } from "@/lib/EnvironmentContext";
import { UserProvider } from "@/lib/AuthContext";
import AppShell from "@/components/AppShell";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "YourTube — Video Platform",
  description: "Functional YouTube-style video platform with subscriptions, downloads, security, and multilingual comments.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-white dark:bg-zinc-950 text-gray-900 dark:text-gray-100 transition-colors">
        <UserProvider>
          <EnvironmentProvider>
            <AppShell>{children}</AppShell>
          </EnvironmentProvider>
        </UserProvider>
      </body>
    </html>
  );
}
