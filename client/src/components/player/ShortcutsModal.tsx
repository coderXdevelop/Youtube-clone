"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Keyboard } from "lucide-react";

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SHORTCUTS = [
  { key: "Space or k", desc: "Play / Pause playback" },
  { key: "← (Left Arrow) or j", desc: "Seek backward 10 seconds" },
  { key: "→ (Right Arrow) or l", desc: "Seek forward 10 seconds" },
  { key: "Shift + ←", desc: "Seek backward 30 seconds" },
  { key: "Shift + →", desc: "Seek forward 30 seconds" },
  { key: "↑ (Up Arrow)", desc: "Increase volume by 10%" },
  { key: "↓ (Down Arrow)", desc: "Decrease volume by 10%" },
  { key: "m", desc: "Mute / Unmute audio" },
  { key: "f", desc: "Toggle Fullscreen mode" },
  { key: "t", desc: "Toggle Theater mode" },
  { key: "i or p", desc: "Toggle Picture-in-Picture (PiP)" },
  { key: "c", desc: "Toggle Subtitles / Captions" },
  { key: "< (Shift + ,)", desc: "Decrease playback speed" },
  { key: "> (Shift + .)", desc: "Increase playback speed" },
  { key: "n or Shift + n", desc: "Play next video" },
  { key: "?", desc: "Open this Keyboard Shortcuts menu" },
];

export default function ShortcutsModal({ isOpen, onClose }: ShortcutsModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md bg-zinc-900 border-zinc-800 text-zinc-100 shadow-2xl p-6">
        <DialogHeader className="pb-2 border-b border-zinc-800">
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold text-white">
            <Keyboard className="w-5 h-5 text-red-500" />
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-2.5 max-h-[60vh] overflow-y-auto pr-1 text-sm py-2">
          {SHORTCUTS.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-zinc-800/60 transition"
            >
              <span className="text-zinc-300 text-xs">{item.desc}</span>
              <kbd className="px-2 py-1 text-[11px] font-mono font-medium text-zinc-200 bg-zinc-800 border border-zinc-700 rounded shadow-sm whitespace-nowrap">
                {item.key}
              </kbd>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
