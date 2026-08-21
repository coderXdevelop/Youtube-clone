"use client";

import SearchResult from "@/components/SearchResult";
import { useSearchParams } from "next/navigation";
import React, { Suspense } from "react";

const SearchContent: React.FC = () => {
    const searchParams = useSearchParams();
    const q = searchParams.get("q") || "";

    return (
        <div className="max-w-6xl">
            {q && (
                <div className="mb-6">
                    <h1 className="text-xl font-medium mb-4">
                        Search results for &quot;{q}&quot;
                    </h1>
                </div>
            )}

            <SearchResult query={q} />
        </div>
    );
};

const SearchPage: React.FC = () => {
    return (
        <div className="flex-1 p-4">
            <Suspense fallback={<div className="text-center py-12">Loading search results...</div>}>
                <SearchContent />
            </Suspense>
        </div>
    );
};

export default SearchPage;
