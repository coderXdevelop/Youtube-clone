import Link from "next/link";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";

interface RelatedVideosProps {
  videos: Array<{
    _id: string;
    videotitle: string;
    videochanel: string;
    views: number;
    createdAt: string;
    thumbnail?: string;
  }>;
}

export default function RelatedVideos({ videos }: RelatedVideosProps) {
  if (!videos || videos.length === 0) {
    return <p className="text-gray-500 italic text-sm">No related videos.</p>;
  }

  return (
    <div className="flex flex-col gap-2 select-none">
      <h3 className="font-bold text-base text-gray-900 mb-1 hidden lg:block">Related videos</h3>
      {videos.map((video) => (
        <Link
          key={video._id}
          href={`/watch/${video._id}`}
          className="flex gap-2.5 p-1 rounded-xl hover:bg-gray-100 transition group"
        >
          {/* Thumbnail */}
          <div className="relative w-40 aspect-video bg-black/90 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center">
            {video.thumbnail ? (
              <Image
                src={video.thumbnail}
                alt={video.videotitle}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-200"
              />
            ) : (
              <video
                src="/assets/vdo.mp4"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
              />
            )}
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0 flex flex-col justify-start py-0.5">
            <h4 className="font-semibold text-sm text-gray-900 line-clamp-2 leading-snug group-hover:text-blue-600">
              {video.videotitle}
            </h4>
            <p className="text-xs text-gray-600 mt-1 font-normal">{video.videochanel}</p>
            <p className="text-xs text-gray-500 font-normal">
              {video.views.toLocaleString()} views •{" "}
              {formatDistanceToNow(new Date(video.createdAt))} ago
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}
