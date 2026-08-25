import React from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface SearchResultProps {
  query: string;
}

interface VideoItem {
  _id: string;
  videotitle: string;
  filename: string;
  filetype: string;
  filepath: string;
  filesize: string;
  videochanel: string;
  Like: number;
  views: number;
  uploader: string;
  createdAt: string;
}

const mockVideos: VideoItem[] = [
  {
    _id: "1",
    videotitle: "Amazing Nature Documentary",
    filename: "nature-doc.mp4",
    filetype: "video/mp4",
    filepath: "/videos/nature-doc.mp4",
    filesize: "500MB",
    videochanel: "Nature Channel",
    Like: 1250,
    views: 45000,
    uploader: "nature_lover",
    createdAt: new Date().toISOString(),
  },
  {
    _id: "2",
    videotitle: "Cooking Tutorial: Perfect Pasta",
    filename: "pasta-tutorial.mp4",
    filetype: "video/mp4",
    filepath: "/videos/pasta-tutorial.mp4",
    filesize: "300MB",
    videochanel: "Chef's Kitchen",
    Like: 890,
    views: 23000,
    uploader: "chef_master",
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
];

const SearchResult = ({ query }: SearchResultProps) => {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">
          Enter a search term to find videos and channels.
        </p>
      </div>
    );
  }

  const video = mockVideos.filter(
    (vid) =>
      vid.videotitle.toLowerCase().includes(trimmedQuery.toLowerCase()) ||
      vid.videochanel.toLowerCase().includes(trimmedQuery.toLowerCase())
  );

  if (video.length === 0) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-2">No results found</h2>
        <p className="text-gray-600">
          Try different keywords or remove search filters
        </p>
      </div>
    );
  }

  const vids = "/video/vdo.mp4";

  return (
    <div className="space-y-6">
      {/* Video Results */}
      <div className="space-y-4">
        {video.map((item: VideoItem) => (
          <div key={item._id} className="flex gap-4 group">
            <Link href={`/watch/${item._id}`} className="flex-shrink-0">
              <div className="relative w-80 aspect-video bg-gray-100 rounded-lg overflow-hidden">
                <video
                  src={vids}
                  className="object-cover group-hover:scale-105 transition-transform duration-200"
                />
                <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-1 rounded">
                  10:24
                </div>
              </div>
            </Link>

            <div className="flex-1 min-w-0 py-1">
              <Link href={`/watch/${item._id}`}>
                <h3 className="font-medium text-lg line-clamp-2 group-hover:text-blue-600 mb-2">
                  {item.videotitle}
                </h3>
              </Link>

              <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                <span>{item.views.toLocaleString()} views</span>
                <span>•</span>
                <span>
                  {formatDistanceToNow(new Date(item.createdAt))} ago
                </span>
              </div>

              <Link
                href={`/channel/${item.uploader}`}
                className="flex items-center gap-2 mb-2 hover:text-blue-600"
              >
                <Avatar className="w-6 h-6">
                  <AvatarImage src="/placeholder.svg?height=24&width=24" />
                  <AvatarFallback className="text-xs">
                    {item.videochanel[0]}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm text-gray-600">
                  {item.videochanel}
                </span>
              </Link>

              <p className="text-sm text-gray-700 line-clamp-2">
                Sample video description that would show search-relevant
                content and help users understand what the video is about
                before clicking.
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Load More Results */}
      <div className="text-center py-8">
        <p className="text-gray-600">
          Showing {video.length} results for &quot;{query}&quot;
        </p>
      </div>
    </div>
  );
};

export default SearchResult;