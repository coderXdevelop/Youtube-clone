"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

const CATEGORIES = [
    "All",
    "Music",
    "Gaming",
    "Movies",
    "News",
    "Sports",
    "Technology",
    "Comedy",
    "Education",
    "Science",
    "Travel",
    "Food",
    "Fashion",
];

interface CategoryTabsProps {
    selectedCategory?: string;
    onSelectCategory?: (category: string) => void;
}

export default function CategoryTabs({
    selectedCategory,
    onSelectCategory,
}: CategoryTabsProps) {
    const [internalCategory, setInternalCategory] = useState("All");

    const currentCategory = selectedCategory !== undefined ? selectedCategory : internalCategory;

    const handleCategoryClick = (category: string) => {
        if (onSelectCategory) {
            onSelectCategory(category);
        } else {
            setInternalCategory(category);
        }
    };

    return (
        <div className="flex gap-2 px-4 py-3 overflow-x-auto no-scrollbar border-b border-gray-100 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm sticky top-0 z-10">
            {CATEGORIES.map((category) => {
                const isActive = currentCategory.toLowerCase() === category.toLowerCase();
                return (
                    <Button
                        key={category}
                        size="sm"
                        variant={isActive ? "default" : "secondary"}
                        className={`whitespace-nowrap px-3.5 py-1.5 h-8 text-xs font-medium rounded-lg transition-all ${
                            isActive
                                ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900 shadow-sm"
                                : "bg-gray-100 hover:bg-gray-200 text-gray-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-gray-200"
                        }`}
                        onClick={() => handleCategoryClick(category)}
                    >
                        {category}
                    </Button>
                );
            })}
        </div>
    );
}