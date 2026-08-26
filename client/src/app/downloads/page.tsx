"use client";

import DownloadsContent from "@/components/DownloadsContent";
import React, { Suspense } from "react";

const DownloadsPage = () => {
    return (
        <main className="flex-1 p-4 md:p-6 bg-white dark:bg-zinc-950 min-h-[calc(100vh-3.5rem)]">
            <div className="max-w-6xl mx-auto">
                <Suspense fallback={<div className="text-sm text-gray-500 py-12 text-center">Loading downloads...</div>}>
                    <DownloadsContent />
                </Suspense>
            </div>
        </main>
    );
};

export default DownloadsPage;
