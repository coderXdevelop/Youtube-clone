"use client";

import React, { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import {
  Copy,
  Check,
  Code2,
  Share2,
  Mail,
  ArrowLeft,
  Link as LinkIcon,
} from "lucide-react";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoTitle?: string;
  videoId?: string;
  customUrl?: string;
}

const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  videoTitle = "Watch this video",
  videoId,
  customUrl,
}) => {
  const [copied, setCopied] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);
  const [showEmbed, setShowEmbed] = useState(false);

  // Calculate base share URL
  const shareUrl = useMemo(() => {
    if (customUrl) return customUrl;
    if (typeof window !== "undefined") {
      return window.location.href;
    }
    return videoId ? `/watch/${videoId}` : "";
  }, [customUrl, videoId]);

  const embedCode = useMemo(() => {
    const embedSrc = shareUrl ? shareUrl.replace("/watch/", "/embed/") : "";
    return `<iframe width="560" height="315" src="${embedSrc}" title="${videoTitle}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`;
  }, [shareUrl, videoTitle]);

  const handleCopyLink = async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = shareUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error("Failed to copy link:", err);
    }
  };

  const handleCopyEmbed = async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(embedCode);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = embedCode;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      setCopiedEmbed(true);
      setTimeout(() => setCopiedEmbed(false), 2500);
    } catch (err) {
      console.error("Failed to copy embed code:", err);
    }
  };

  // Direct app sharing redirect URLs with authentic brand styles
  const socialPlatforms = [
    {
      name: "WhatsApp",
      bgColor: "bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366] hover:text-white border-[#25D366]/20",
      href: `https://api.whatsapp.com/send?text=${encodeURIComponent(`${videoTitle} - ${shareUrl}`)}`,
      icon: (
        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
          <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.664-.698c.969.541 1.944.827 2.795.827h.001c3.182 0 5.768-2.586 5.768-5.766 0-3.18-2.586-5.714-5.769-5.714zm3.376 8.214c-.149.418-.756.777-1.047.827-.27.047-.618.068-1.782-.416-1.488-.62-2.443-2.128-2.518-2.228-.074-.1-6.04-8.038.599-8.914.07-.095.155-.145.24-.145.085 0 .17.002.245.006.182.008.283.02.409.32.158.377.54 1.317.587 1.413.048.096.08.209.016.335-.064.127-.096.206-.191.317-.095.112-.2.25-.286.336-.095.096-.195.2-.084.391.111.191.494.814 1.06 1.318.73.65 1.346.852 1.537.947.191.096.303.08.415-.048.112-.127.478-.557.606-.748.127-.191.255-.159.43-.095.176.064 1.114.525 1.305.621.191.095.318.143.366.223.048.079.048.461-.101.879z" />
        </svg>
      ),
    },
    {
      name: "X / Twitter",
      bgColor: "bg-zinc-800/10 dark:bg-zinc-100/10 text-zinc-900 dark:text-zinc-100 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black border-zinc-300 dark:border-zinc-700",
      href: `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(videoTitle)}`,
      icon: (
        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
    },
    {
      name: "Facebook",
      bgColor: "bg-[#1877F2]/10 text-[#1877F2] hover:bg-[#1877F2] hover:text-white border-[#1877F2]/20",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
      icon: (
        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
          <path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036c-2.148 0-2.797 1.056-2.797 2.684v1.287h4.004l-.538 3.667h-3.466v7.98c5.44-.755 9.61-5.412 9.61-11.053 0-6.195-5.025-11.22-11.22-11.22C5.025.418 0 5.443 0 11.638c0 5.641 4.17 10.298 9.101 11.053z" />
        </svg>
      ),
    },
    {
      name: "Reddit",
      bgColor: "bg-[#FF4500]/10 text-[#FF4500] hover:bg-[#FF4500] hover:text-white border-[#FF4500]/20",
      href: `https://reddit.com/submit?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(videoTitle)}`,
      icon: (
        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
          <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.56 12 8 12.562 8 13.252c0 .69.56 1.248 1.25 1.248.69 0 1.248-.558 1.248-1.248C10.498 12.562 9.94 12 9.25 12zm5.5 0c-.69 0-1.248.562-1.248 1.252 0 .69.558 1.248 1.248 1.248.69 0 1.25-.558 1.25-1.248C16 12.562 15.44 12 14.75 12zm-5.464 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.197-2.512-.73a.326.326 0 0 0-.232-.094z" />
        </svg>
      ),
    },
    {
      name: "Telegram",
      bgColor: "bg-[#24A1DE]/10 text-[#24A1DE] hover:bg-[#24A1DE] hover:text-white border-[#24A1DE]/20",
      href: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(videoTitle)}`,
      icon: (
        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 11.944 0zm5.834 7.625l-2.023 9.539c-.15.68-.558.847-1.127.525l-3.08-2.27-1.486 1.43c-.165.165-.303.303-.62.303l.221-3.14 5.719-5.166c.249-.221-.054-.345-.386-.123L9.04 13.315l-3.045-.953c-.663-.207-.676-.663.139-.982l11.9-4.586c.551-.2 1.034.135.844.831z" />
        </svg>
      ),
    },
    {
      name: "LinkedIn",
      bgColor: "bg-[#0A66C2]/10 text-[#0A66C2] hover:bg-[#0A66C2] hover:text-white border-[#0A66C2]/20",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
      icon: (
        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
          <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
        </svg>
      ),
    },
    {
      name: "Email",
      bgColor: "bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500 hover:text-white border-red-500/20",
      href: `mailto:?subject=${encodeURIComponent(videoTitle)}&body=${encodeURIComponent(shareUrl)}`,
      icon: <Mail className="w-5 h-5" />,
    },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-full max-w-[480px] sm:max-w-[500px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl rounded-2xl p-5 sm:p-6 overflow-hidden min-w-0">
        {showEmbed ? (
          /* Embed Code Sub-view */
          <div className="space-y-4 w-full min-w-0">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowEmbed(false)}
                className="p-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 cursor-pointer transition-colors"
                title="Back to share options"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <DialogTitle className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100">
                Embed Video
              </DialogTitle>
            </div>

            <div className="space-y-3 w-full min-w-0">
              <textarea
                readOnly
                rows={4}
                value={embedCode}
                className="w-full text-xs font-mono p-3 bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-blue-500 select-all resize-none min-w-0"
              />

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-zinc-200 dark:border-zinc-800 w-full">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowEmbed(false)}
                  className="rounded-xl text-xs px-4 h-9 border-zinc-300 dark:border-zinc-700 cursor-pointer"
                >
                  Back
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleCopyEmbed}
                  className={`rounded-xl text-xs font-semibold px-4 h-9 flex items-center gap-1.5 transition-all cursor-pointer ${
                    copiedEmbed
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                      : "bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                  }`}
                >
                  {copiedEmbed ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Embed Code</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          /* Standard Share Options View */
          <div className="space-y-4 w-full min-w-0">
            <DialogHeader className="space-y-1 text-left">
              <DialogTitle className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Share2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Share</span>
              </DialogTitle>
              {videoTitle && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-1 pr-6">
                  {videoTitle}
                </p>
              )}
            </DialogHeader>

            {/* TOP SECTION: Direct App Share Logos */}
            <div className="w-full min-w-0">
              <div className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                Share to App
              </div>
              <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-2 px-1 w-full min-w-0 max-w-full">
                {/* Embed Quick Action */}
                <button
                  type="button"
                  onClick={() => setShowEmbed(true)}
                  className="flex flex-col items-center gap-1.5 group shrink-0 cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 group-hover:bg-blue-600 group-hover:text-white transition-all duration-200 flex items-center justify-center border border-zinc-200 dark:border-zinc-700 shadow-xs group-hover:scale-105">
                    <Code2 className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] text-zinc-600 dark:text-zinc-400 font-medium group-hover:text-zinc-900 dark:group-hover:text-zinc-200">
                    Embed
                  </span>
                </button>

                {/* Direct App Icons */}
                {socialPlatforms.map((platform) => (
                  <a
                    key={platform.name}
                    href={platform.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-center gap-1.5 group shrink-0 cursor-pointer"
                    title={`Share on ${platform.name}`}
                  >
                    <div
                      className={`w-12 h-12 rounded-full transition-all duration-200 flex items-center justify-center border shadow-xs group-hover:scale-105 ${platform.bgColor}`}
                    >
                      {platform.icon}
                    </div>
                    <span className="text-[11px] text-zinc-600 dark:text-zinc-400 font-medium group-hover:text-zinc-900 dark:group-hover:text-zinc-200">
                      {platform.name}
                    </span>
                  </a>
                ))}
              </div>
            </div>

            <div className="border-t border-zinc-200 dark:border-zinc-800 my-1" />

            {/* MIDDLE SECTION: Dedicated Link Box in Middle */}
            <div className="space-y-2 w-full min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Video Link
                </span>
                {copied && (
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 animate-in fade-in duration-150">
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied to clipboard!</span>
                  </span>
                )}
              </div>

              {/* Dedicated Full-Width Link Box */}
              <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-zinc-100 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-xl focus-within:border-blue-500 dark:focus-within:border-blue-500 transition-colors w-full min-w-0">
                <LinkIcon className="w-4 h-4 text-zinc-400 shrink-0" />
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                  className="w-full min-w-0 flex-1 text-xs sm:text-sm font-mono text-zinc-800 dark:text-zinc-200 bg-transparent border-none outline-none select-all"
                />
              </div>
            </div>

            {/* BOTTOM SECTION: Cancel and Copy Button properly aligned */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-200 dark:border-zinc-800 w-full min-w-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                className="px-4 h-9 text-xs font-medium rounded-xl border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleCopyLink}
                className={`px-5 h-9 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95 shrink-0 ${
                  copied
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                    : "bg-blue-600 hover:bg-blue-700 text-white"
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Link</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ShareModal;
