'use client'
import VideoCard from "./videocard";

const dummyVideos = [
    {
        id: "1",
        title: "Pancharangi | Kannada Full Movie HD",
        channel: "Anand Audio",
        views: "3.1M views",
        timeAgo: "12 years ago",
    },
    {
        id: "2",
        title: "Sadhana - Annam Brahma 9 | Food as Advaita",
        channel: "Sri RamachandrapuraMatha",
        views: "6.1K views",
        timeAgo: "4 days ago",
    },
    {
        id: "3",
        title: "KUNAL KAMRA VS REPORTERS IMPROV COMEDY SPECIAL",
        channel: "Kunal Kamra",
        views: "1.2M views",
        timeAgo: "1 year ago",
    },
];

const VideoGrid = () => {
    return (
        <main className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 overflow-y-auto">
            {dummyVideos.map((video) => (
                <VideoCard key={video.id} {...video} />
            ))}
        </main>
    );
};

export default VideoGrid;
