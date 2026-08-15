"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { MoreVertical, X, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface HistoryItem {
  _id: string;
  videoid: {
    _id: string;
    videotitle: string;
    videochanel: string;
    views: number;
    createdAt: string;
    filepath?: string;
  };
  createdAt: string;
}

export default function HistoryContent() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Fake user for now
const user = { _id: "demo123", name: "Demo User" };

useEffect(() => {
  if (user) {
    loadHistory();
  }
}, []); // ✅ only runs once


  const loadHistory = async () => {
    if (!user) return;

    try {
      // Fake data for now
      const fakeHistory: HistoryItem[] = [
        {
          _id: "h1",
          videoid: {
            _id: "v1",
            videotitle: "Amazing Nature Documentary",
            videochanel: "Nature Channel",
            views: 45000,
            createdAt: new Date().toISOString(),
            filepath: "/assets/vdo.mp4",
          },
          createdAt: new Date().toISOString(),
        },
        {
          _id: "h2",
          videoid: {
            _id: "v2",
            videotitle: "Ocean Wonders",
            videochanel: "Marine Life",
            views: 12000,
            createdAt: new Date().toISOString(),
            filepath: "/assets/vdo.mp4",
          },
          createdAt: new Date().toISOString(),
        },
      ];
      setHistory(fakeHistory);
    } catch (error) {
      console.error("Error loading history:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFromHistory = (historyId: string) => {
    setHistory(history.filter((item) => item._id !== historyId));
  };

  if (loading) {
    return <div>Loading history...</div>;
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <Clock className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h2 className="text-xl font-semibold mb-2">
          Keep track of what you watch
        </h2>
        <p className="text-gray-600">
          Watch history isn't viewable when signed out.
        </p>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-12">
        <Clock className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h2 className="text-xl font-semibold mb-2">No watch history yet</h2>
        <p className="text-gray-600">Videos you watch will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600">{history.length} videos</p>
      </div>

      <div className="space-y-4">
        {history.map((item) => (
          <div key={item._id} className="flex gap-4 group">
            <Link href={`/watch/${item.videoid._id}`} className="flex-shrink-0">
              <div className="relative w-40 aspect-video bg-gray-100 rounded overflow-hidden">
                <video
                  src={item.videoid.filepath}
                  className="object-cover group-hover:scale-105 transition-transform duration-200"
                />
              </div>
            </Link>

            <div className="flex-1 min-w-0">
              <Link href={`/watch/${item.videoid._id}`}>
                <h3 className="font-medium text-sm line-clamp-2 group-hover:text-blue-600 mb-1">
                  {item.videoid.videotitle}
                </h3>
              </Link>
              <p className="text-sm text-gray-600">{item.videoid.videochanel}</p>
              <p className="text-sm text-gray-600">
                {item.videoid.views.toLocaleString()} views •{" "}
                {formatDistanceToNow(new Date(item.videoid.createdAt))} ago
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Added {formatDistanceToNow(new Date(item.createdAt))} ago
              </p>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="opacity-0 group-hover:opacity-100"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                }
              />


              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => handleRemoveFromHistory(item._id)}
                >
                  <X className="w-4 h-4 mr-2" />
                  Remove from watch history
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}
      </div>
    </div>
  );
}
