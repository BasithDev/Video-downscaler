import type { VideoMeta } from './VideoPlayer';

interface UploadsListProps {
  videos: VideoMeta[];
  onSelect: (video: VideoMeta) => void;
  selected?: VideoMeta | null;
}

const UploadsList = ({ videos, onSelect, selected }: UploadsListProps) => {
  return (
    <div className="mt-8 bg-gray-100 p-4 rounded-lg">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Processed Videos</h2>
      <div className="space-y-3">
        {videos.length === 0 && (
          <div className="text-gray-400 text-sm">No processed videos yet.</div>
        )}
        {videos.map((item) => {
          const isSelected = selected && selected.filename === item.filename;
          return (
            <div
              key={item.filename}
              className={`flex items-center cursor-pointer justify-between bg-white shadow rounded-lg px-4 py-3 border transition-colors duration-300 group
                ${isSelected ? 'border-orange-500 bg-orange-100' : 'border-gray-100 hover:bg-orange-300 hover:border-orange-300'}`}
              onClick={() => onSelect(item)}
            >
              <div>
                <span className={`font-medium ${isSelected ? 'text-orange-700' : 'group-hover:text-gray-900 text-gray-700'}`}>{item.filename}</span>
                {/* Optionally, add resolution info if you want */}
              </div>
              <a
                href={item.url}
                // download
                className="px-4 py-2 rounded-md font-semibold text-white shadow-sm transition-colors"
                style={{ background: '#f57b11' }}
                onClick={e => e.stopPropagation()}
              >
                Download
              </a>
            </div>
          );
        })}

        <button className="px-4 py-2 rounded-md font-semibold text-white text-xl shadow-sm transition-colors mt-4 w-full cursor-pointer" style={{ background: '#f57b11' }}>Download All</button>
      </div>
    </div>
  );
};

export default UploadsList;

