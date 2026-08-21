// src/components/VideoInfo.tsx
"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThumbsUp, ThumbsDown, Share2, Download, MoreHorizontal } from "lucide-react";

interface VideoInfoProps {
  title: string;
  channelName: string;
  channelAvatar?: string;
  channelUrl?: string;
  subscribersCount?: string;
  views: number;
  uploadedAt: string;
  description?: string;
  externalLinks?: { label: string; url: string }[];
  initialLikes?: number;
  initialDislikes?: number;
}

const VideoInfo: React.FC<VideoInfoProps> = ({
  title,
  channelName,
  channelAvatar,
  channelUrl,
  subscribersCount = "1.2M subscribers",
  views,
  uploadedAt,
  description,
  externalLinks,
  initialLikes = 1250,
  initialDislikes = 50,
}) => {
  const [likes, setLikes] = useState(initialLikes);
  const [liked, setLiked] = useState(false);
  const [dislikes, setDislikes] = useState(initialDislikes);
  const [disliked, setDisliked] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleLike = () => {
    if (liked) {
      setLikes(likes - 1);
      setLiked(false);
    } else {
      setLikes(likes + 1);
      setLiked(true);
      if (disliked) {
        setDislikes(dislikes - 1);
        setDisliked(false);
      }
    }
  };

  const handleDislike = () => {
    if (disliked) {
      setDislikes(dislikes - 1);
      setDisliked(false);
    } else {
      setDislikes(dislikes + 1);
      setDisliked(true);
      if (liked) {
        setLikes(likes - 1);
        setLiked(false);
      }
    }
  };

  const handleSubscribe = () => {
    setSubscribed(!subscribed);
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      alert("Video link copied to clipboard!");
    } catch {
      alert("Failed to copy link");
    }
  };

  const handleDownload = () => {
    alert("Download started (demo).");
  };

  return (
    <div className="mt-3">
      {/* Title */}
      <h1 className="text-xl font-bold text-gray-900">{title}</h1>

      {/* Channel + Action Toolbar Row */}
      <div className="flex flex-wrap items-center justify-between gap-4 mt-3">
        {/* Left Section: Avatar, Channel Name, Subs, Subscribe button */}
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10">
            {channelAvatar ? (
              <AvatarImage src={channelAvatar} alt={channelName} />
            ) : null}
            <AvatarFallback className="bg-gray-200 text-gray-700 font-medium">
              {channelName ? channelName.charAt(0) : "N"}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col justify-center">
            {channelUrl ? (
              <Link href={channelUrl} className="font-semibold text-gray-900 text-base leading-tight hover:underline">
                {channelName}
              </Link>
            ) : (
              <p className="font-semibold text-gray-900 text-base leading-tight">{channelName}</p>
            )}
            <p className="text-xs text-gray-500 font-normal">{subscribersCount}</p>
          </div>
          <button
            onClick={handleSubscribe}
            className={`ml-3 px-4 py-2 rounded-full font-medium text-sm transition-colors ${
              subscribed
                ? "bg-gray-200 hover:bg-gray-300 text-gray-800"
                : "bg-black hover:bg-neutral-800 text-white"
            }`}
          >
            {subscribed ? "Subscribed" : "Subscribe"}
          </button>
        </div>

        {/* Right Section: Like/Dislike, Share, Download, More */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Like / Dislike Split Pill */}
          <div className="flex items-center bg-gray-100 hover:bg-gray-200/80 rounded-full text-sm font-medium text-gray-800 overflow-hidden">
            <button
              onClick={handleLike}
              className={`flex items-center gap-1.5 px-3.5 py-2 hover:bg-gray-200 transition ${
                liked ? "text-blue-600 font-semibold" : ""
              }`}
            >
              <ThumbsUp className={`w-4 h-4 ${liked ? "fill-blue-600 text-blue-600" : "text-gray-800"}`} />
              <span>{likes.toLocaleString()}</span>
            </button>
            <div className="w-[1px] h-5 bg-gray-300"></div>
            <button
              onClick={handleDislike}
              className={`flex items-center gap-1.5 px-3.5 py-2 hover:bg-gray-200 transition ${
                disliked ? "text-blue-600 font-semibold" : ""
              }`}
            >
              <ThumbsDown className={`w-4 h-4 ${disliked ? "fill-blue-600 text-blue-600" : "text-gray-800"}`} />
              {dislikes > 0 && <span>{dislikes}</span>}
            </button>
          </div>

          {/* Share Button */}
          <button
            onClick={handleShare}
            className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 rounded-full px-4 py-2 text-sm font-medium text-gray-800 transition"
          >
            <Share2 className="w-4 h-4 text-gray-800" />
            <span>Share</span>
          </button>

          {/* Download Button */}
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 rounded-full px-4 py-2 text-sm font-medium text-gray-800 transition"
          >
            <Download className="w-4 h-4 text-gray-800" />
            <span>Download</span>
          </button>

          {/* More Options Button */}
          <button className="flex items-center justify-center w-9 h-9 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-800 transition">
            <MoreHorizontal className="w-5 h-5 text-gray-800" />
          </button>
        </div>
      </div>

      {/* Description Box */}
      {description && (
        <div
          onClick={() => setExpanded(!expanded)}
          className="bg-gray-100 hover:bg-gray-200/70 transition-colors p-3.5 rounded-xl text-sm mt-4 text-gray-900 cursor-pointer select-none"
        >
          <div className="font-semibold text-sm text-gray-900 mb-1 flex items-center gap-2">
            <span>{views.toLocaleString()} views</span>
            <span>{uploadedAt}</span>
          </div>

          <p className={`text-sm text-gray-800 whitespace-pre-line ${expanded ? "" : "line-clamp-2"}`}>
            {description}
          </p>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="font-semibold mt-2 text-xs text-gray-800 block hover:underline"
          >
            {expanded ? "Show less" : "Show more"}
          </button>
        </div>
      )}

      {/* External Links */}
      {externalLinks && externalLinks.length > 0 && (
        <div className="mt-3 space-y-1">
          {externalLinks.map((link, idx) => (
            <Link
              key={idx}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-blue-600 hover:underline text-sm font-medium"
            >
              🔗 {link.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default VideoInfo;
