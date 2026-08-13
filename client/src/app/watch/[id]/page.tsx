import VideoPlayer from "@/components/videoplayer";
import VideoInfo from "@/components/videoinfo";

export default function WatchPage({ params }: { params: { id: string } }) {
  const videoId = params.id;

  // Fake data for now
  const videoData = {
    src: "/sample.mp4",
    poster: "/thumbnail.jpg",
    title: "My Demo Video",
    channelName: "Demo Channel",
    channelAvatar: "/avatar.png",
    views: 12345,
    uploadedAt: "3 days ago",
    description: "This is a placeholder description for the video.",
  };

  return (
    <div className="flex flex-col">
      <VideoPlayer src={videoData.src} poster={videoData.poster} />
      <VideoInfo
        title={videoData.title}
        channelName={videoData.channelName}
        channelAvatar={videoData.channelAvatar}
        views={videoData.views}
        uploadedAt={videoData.uploadedAt}
        description={videoData.description}
      />
    </div>
  );
}
