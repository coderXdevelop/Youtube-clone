"use client";

import ExploreContent from "@/components/ExploreContent";
import React, { Suspense } from "react";

export default function ExplorePage() {
    return (
        <main className="flex-1 p-4 md:p-8 bg-white dark:bg-zinc-950 min-h-[calc(100vh-3.5rem)]">
            <div className="max-w-7xl mx-auto">
                <Suspense fallback={<div className="text-sm text-gray-500 py-20 text-center">Loading explore feed...</div>}>
                    <ExploreContent />
                </Suspense>
            </div>
        </main>
    );
}
