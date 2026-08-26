"use client";

import SubscriptionDashboard from "@/components/SubscriptionDashboard";
import React, { Suspense } from "react";

export default function SubscriptionsPage() {
    return (
        <main className="flex-1 p-4 md:p-8 bg-white dark:bg-zinc-950 min-h-[calc(100vh-3.5rem)]">
            <div className="max-w-7xl mx-auto">
                <Suspense fallback={<div className="text-sm text-gray-500 py-16 text-center">Loading subscription plans...</div>}>
                    <SubscriptionDashboard />
                </Suspense>
            </div>
        </main>
    );
}
