import ReactPlayer from 'react-player';

export interface VideoMeta {
  filename: string;
  url: string;
  size: string;
}

interface VideoPlayerProps {
  video?: VideoMeta | null;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ video }) => {
  if (!video) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full text-gray-400 text-lg">
        <span>Select a processed video to preview it.</span>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col bg-white rounded-lg shadow-lg">
      <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
        <div className="absolute inset-0">
          <ReactPlayer
            src={video.url}
            controls={true}
            width="100%"
            height="100%"
            style={{ borderRadius: '12px', overflow: 'hidden', background: '#000' }}
          />
        </div>
      </div>
      <div className="flex items-center justify-between p-4">
        <div>
          <div className="font-bold text-lg text-gray-800">{video.filename}</div>
          <div className="text-xs text-gray-500">{video.size}</div>
        </div>
        <a
          href={video.url}
          download
          className="px-5 py-2 rounded-md font-semibold text-white shadow-sm transition-colors text-base"
          style={{ background: '#f57b11' }}
        >
          Download
        </a>
      </div>
    </div>
  );
};

export default VideoPlayer;