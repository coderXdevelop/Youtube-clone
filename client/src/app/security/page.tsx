"use client";

import React, { Suspense } from "react";
import AccountSecurityContent from "@/components/AccountSecurityContent";

export default function SecurityPage() {
    return (
        <main className="flex-1 p-4 md:p-8 bg-zinc-50 dark:bg-zinc-950 min-h-[calc(100vh-3.5rem)]">
            <div className="max-w-6xl mx-auto">
                <Suspense
                    fallback={
                        <div className="text-sm text-gray-500 py-16 text-center">
                            Loading account security & session details...
                        </div>
                    }
                >
                    <AccountSecurityContent />
                </Suspense>
            </div>
        </main>
    );
}
