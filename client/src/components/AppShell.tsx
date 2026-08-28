"use client";

import React from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";
import { usePathname } from "next/navigation";

export default function AppShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isWatchPage = pathname?.startsWith("/watch/");

    return (
        <div className="flex flex-col min-h-screen h-screen bg-white dark:bg-zinc-950 text-gray-900 dark:text-gray-100 overflow-hidden">
            {/* Top Navigation Header Bar */}
            <Header />

            {/* Main Application Body */}
            <div className="flex flex-1 overflow-hidden">
                {/* Responsive Sidebar (Desktop inline unless on watch page; Mobile drawer always supported) */}
                {!isWatchPage ? (
                    <Sidebar />
                ) : (
                    /* On watch page, only render mobile drawer when toggled */
                    <Sidebar className="hidden" />
                )}

                {/* Main Scrollable Viewport */}
                <main className="flex-1 flex flex-col overflow-y-auto min-w-0 bg-white dark:bg-zinc-950">
                    {children}
                </main>
            </div>
        </div>
    );
}
