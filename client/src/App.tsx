import { useState } from 'react';
import UploaderBox from './components/UploaderBox';
import { Toaster } from 'react-hot-toast';
import UploadsList from './components/UploadsList';
import VideoPlayer from './components/VideoPlayer';
import type { VideoMeta } from './components/VideoPlayer';

// Dummy processed video data for demo
const dummyVideos: VideoMeta[] = [
  {
    filename: 'Sample_480p.mp4',
    url: 'https://youtube.com/shorts/RNH_Y-XLZvQ?si=TErmnz1_VAY4aqV7',
    size: '4.2 MB',
  },
  {
    filename: 'Sample_360p.mp4',
    url: 'https://www.w3schools.com/html/movie.mp4',
    size: '2.1 MB',
  },
  {
    filename: 'Sample_240p.mp4',
    url: 'https://samplelib.com/mp4/sample-5s.mp4',
    size: '0.5 MB',
  },
];

function App() {
  const [selectedVideo, setSelectedVideo] = useState<VideoMeta | null>(null);

  return (
    <>
      <Toaster position="top-center" toastOptions={{
        style: { background: '#f57b11', color: '#fff', fontWeight: 600 },
        iconTheme: { primary: '#fff', secondary: '#f57b11' }
      }} />
      <header className="p-4 shadow-lg flex justify-center">
        <h1 
          style={{ color: '#f57b11' }}
          className="text-4xl font-bold">
          Video Downscaler
        </h1>
      </header>

      <div className="flex h-screen">
        <div className="w-1/4 border-r border-gray-300">
          <div className="p-4">
            <UploaderBox />
            <UploadsList
              videos={dummyVideos}
              onSelect={setSelectedVideo}
              selected={selectedVideo}
            />
          </div>
        </div>
        <div className="w-3/4 p-4">
          <VideoPlayer video={selectedVideo} />
        </div>
      </div>
    </>
  );
}

export default App;
