import { useState, useRef } from 'react';
import type { ChangeEvent } from 'react';
import { FiUpload, FiX, FiVideo } from 'react-icons/fi';

interface VideoMetadata {
  name: string;
  size: number;
  type: string;
  duration?: number;
  resolution?: string;
  width?: number;
  height?: number;
}

export default function UploaderBox() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  const [selectedResolutions, setSelectedResolutions] = useState<string[]>([]);
  const [availableResolutions, setAvailableResolutions] = useState<{label: string, value: string, width: number, height: number}[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // All possible resolutions in descending order
  const allResolutions = [
    { label: '1080p', value: '1080p', width: 1920, height: 1080 },
    { label: '720p', value: '720p', width: 1280, height: 720 },
    { label: '480p', value: '480p', width: 854, height: 480 },
    { label: '360p', value: '360p', width: 640, height: 360 },
    { label: '240p', value: '240p', width: 426, height: 240 }
  ];

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1000;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processVideoFile(files[0]);
    }
  };

  const processVideoFile = (file: File) => {
    console.log('=== File Info ===');
    console.log('Name:', file.name);
    console.log('Type:', file.type);
    console.log('Size:', file.size, 'bytes');
    
    const fileName = file.name.toLowerCase();
    const fileExtension = fileName.includes('.') 
      ? fileName.substring(fileName.lastIndexOf('.')) 
      : '';
    
    console.log('Detected extension:', fileExtension);
    
    const isLikelyVideo = 
      file.type.startsWith('video/') || 
      file.type === '' || 
      ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.m4v', '.wmv', '.flv', '.3gp']
        .some(ext => fileName.endsWith(ext));
    
    if (!isLikelyVideo) {
      console.warn('File does not appear to be a video');
      alert(`This doesn't appear to be a video file.\n\nDetected: ${file.type} (${fileExtension})`);
      return;
    }
    
    console.log('File appears to be a video, proceeding...');

    const videoUrl = URL.createObjectURL(file);
    const video = document.createElement('video');
    
    video.onloadedmetadata = () => {
      console.log('Video metadata loaded successfully');
      // Calculate available resolutions based on video dimensions
      if (video.videoWidth && video.videoHeight) {
        const videoHeight = Math.min(video.videoWidth * (9/16), video.videoHeight);
        const resolutions = allResolutions.filter(
          res => res.height < videoHeight && res.height >= 240
        );
        if (resolutions.length === 0) {
          import('react-hot-toast').then(({ toast }) => {
            toast.error('Video resolution is too low to downscale (minimum 360p required)', {
              style: {
                background: '#f57b11',
                color: '#fff',
                fontWeight: 600
              },
              iconTheme: {
                primary: '#fff',
                secondary: '#f57b11',
              },
              position: 'top-center',
              duration: 4000,
            });
          });
          // Do not set the file or metadata
          setVideoFile(null);
          setMetadata(null);
          setAvailableResolutions([]);
          setSelectedResolutions([]);
          URL.revokeObjectURL(videoUrl);
          return;
        }
        setVideoFile(file);
        setMetadata({
          name: file.name,
          size: file.size,
          type: file.type,
          duration: video.duration,
          resolution: video.videoWidth && video.videoHeight 
            ? `${video.videoWidth}x${video.videoHeight}` 
            : 'Unknown',
          width: video.videoWidth,
          height: video.videoHeight
        });
        setAvailableResolutions(resolutions);
      }
      URL.revokeObjectURL(videoUrl);
    };
    
    video.onerror = (error) => {
      console.error('Error loading video metadata:', error);
      setMetadata({
        name: file.name,
        size: file.size,
        type: file.type,
        duration: 0,
        resolution: 'Unknown',
        width: 0,
        height: 0
      });
      URL.revokeObjectURL(videoUrl);
    };
    
    video.preload = 'metadata';
    video.src = videoUrl;
  };

  const handleRemove = () => {
    setVideoFile(null);
    setMetadata(null);
    setSelectedResolutions([]);
    setAvailableResolutions([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const toggleResolution = (resolution: string) => {
    setSelectedResolutions(prev => 
      prev.includes(resolution)
        ? prev.filter(r => r !== resolution)
        : [...prev, resolution]
    );
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-gray-100 rounded-lg shadow-xl">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Select Video File</h2>
      
      <div className="flex flex-col bg-white items-center justify-center space-y-4">
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="video/*"
          onChange={handleFileChange}
        />
        
        {!videoFile ? (
          <button
            onClick={handleButtonClick}
            className="flex flex-col items-center justify-center w-full py-12 border-2 border-dashed border-gray-300 rounded-lg hover:border-orange-400 transition-colors"
          >
            <FiUpload className="w-12 h-12 text-gray-400 mb-4" />
            <span className="text-lg font-medium text-gray-700">Select Video File</span>
            <span className="text-sm text-gray-500 mt-1">Supported formats: MP4, WebM, MOV, AVI, MKV</span>
          </button>
        ) : (
          <div className="w-full p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <FiVideo style={{color: '#f57b11'}} className="w-8 h-8" />
                <div>
                  <p className="text-sm font-medium text-gray-800">{metadata?.name}</p>
                  <p className="text-xs text-gray-500">{metadata && formatFileSize(metadata.size)}</p>
                </div>
              </div>
              <button 
                onClick={handleRemove}
                className="text-gray-400 hover:text-red-500"
                aria-label="Remove file"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {metadata?.resolution && (
              <div className="text-sm text-gray-600 space-y-1 mt-2">
                <p>Resolution: {metadata.resolution}</p>
                <p>Duration: {metadata.duration ? `${Math.floor(metadata.duration / 60)}:${Math.floor(metadata.duration % 60).toString().padStart(2, '0')}` : 'N/A'}</p>
              </div>
            )}

            {availableResolutions.length > 0 && (
  <div className="mt-4">
    <h4 className="text-sm font-medium text-gray-700 mb-2">Select Resolutions to Generate:</h4>
    <div className="flex flex-wrap gap-3">
      {availableResolutions.map((res) => {
        const selected = selectedResolutions.includes(res.value);
        return (
          <button
            type="button"
            key={res.value}
            onClick={() => toggleResolution(res.value)}
            className={`transition-all px-4 py-3 rounded-lg border font-semibold shadow-sm focus:outline-none ${selected ? '' : 'bg-white text-gray-800 border-gray-300 hover:border-orange-400'}`}
            aria-pressed={selected}
            style={selected ? {
              backgroundColor: '#f57b11',
              color: '#fff',
              borderColor: '#f57b11',
              boxShadow: '0 0 0 2px #fde4c3'
            } : {}}
          >
            <span className="block text-base">{res.label}</span>
            <span className="block text-xs font-normal">{res.width}x{res.height}</span>
          </button>
        );
      })}
    </div>
    <button
      className={`w-full mt-6 px-6 py-2 rounded-md text-white font-medium transition-all ${selectedResolutions.length > 0 ? '' : 'bg-gray-400 cursor-not-allowed'}`}
      style={selectedResolutions.length > 0 ? {
        backgroundColor: '#f57b11',
        borderColor: '#f57b11'
      } : {}}
      disabled={selectedResolutions.length === 0}
    >
      Process {selectedResolutions.length > 0 ? `(${selectedResolutions.length})` : ''} Videos
    </button>
  </div>
)}
          </div>
        )}
      </div>
    </div>
  );
}