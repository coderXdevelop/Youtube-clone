"use client";

import React from "react";
import { RotateCcw, RotateCw } from "lucide-react";

interface DoubleClickRippleProps {
  side: "left" | "right" | null;
}

export default function DoubleClickRipple({ side }: DoubleClickRippleProps) {
  if (!side) return null;

  return (
    <div
      className={`absolute inset-y-0 ${
        side === "left" ? "left-0 w-1/3 rounded-r-full" : "right-0 w-1/3 rounded-l-full"
      } bg-white/15 backdrop-blur-[2px] flex items-center justify-center pointer-events-none transition-all duration-500 animate-in fade-in zoom-in-90 z-20`}
    >
      <div className="flex flex-col items-center gap-1.5 text-white font-medium drop-shadow-md">
        {side === "left" ? (
          <>
            <RotateCcw className="w-8 h-8 animate-spin-once" />
            <span className="text-xs tracking-wide">10 seconds</span>
          </>
        ) : (
          <>
            <RotateCw className="w-8 h-8 animate-spin-once" />
            <span className="text-xs tracking-wide">10 seconds</span>
          </>
        )}
      </div>
    </div>
  );
}
