import React, { useState, useEffect } from 'react';
import videoService from '../../services/videoService';

const VideoLibrary = ({ refreshTrigger }) => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedVideo, setSelectedVideo] = useState(null);

  useEffect(() => {
    loadVideos();
  }, [refreshTrigger]);

  const loadVideos = async () => {
    try {
      setLoading(true);
      const response = await videoService.getVideos();
      setVideos(response.videos || []);
      setError(null);
    } catch (err) {
      setError('Failed to load videos');
      console.error('Load videos error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVideo = async (videoId) => {
    if (!window.confirm('Are you sure you want to delete this video?')) {
      return;
    }

    try {
      await videoService.deleteVideo(videoId);
      setVideos(videos.filter(video => video.id !== videoId));
    } catch (err) {
      setError('Failed to delete video');
      console.error('Delete video error:', err);
    }
  };

  const handleDownloadVideo = async (videoId) => {
    try {
      const response = await videoService.downloadVideo(videoId);
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `video-${videoId}.mp4`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError('Failed to download video');
      console.error('Download video error:', err);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'generating':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'processing':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return (
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      case 'generating':
      case 'processing':
        return (
          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        );
      case 'failed':
        return (
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">Video Library</h3>
          <button
            onClick={loadVideos}
            className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="p-6">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {videos.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No videos yet</h3>
            <p className="text-gray-500">Generate your first video to see it here</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map((video) => (
              <div key={video.id} className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                {/* Video Thumbnail */}
                <div className="aspect-video bg-gray-100 flex items-center justify-center">
                  {video.thumbnail_path ? (
                    <img
                      src={`/api/videos/${video.id}/thumbnail`}
                      alt={video.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-gray-400">
                      <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Video Info */}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-gray-900 truncate">{video.title}</h4>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(video.status)}`}>
                      {getStatusIcon(video.status)}
                      <span className="ml-1">{video.status}</span>
                    </span>
                  </div>

                  {video.book_title && (
                    <p className="text-sm text-gray-600 mb-2">From: {video.book_title}</p>
                  )}

                  <div className="text-xs text-gray-500 mb-3">
                    Created: {new Date(video.created_at).toLocaleDateString()}
                  </div>

                  {/* Video Script Preview */}
                  {video.script && (
                    <div className="mb-3">
                      <p className="text-sm text-gray-700 line-clamp-2">{video.script}</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex justify-between items-center">
                    <div className="flex space-x-2">
                      {video.status === 'completed' && (
                        <button
                          onClick={() => handleDownloadVideo(video.id)}
                          className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                        >
                          Download
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedVideo(video)}
                        className="text-gray-600 hover:text-gray-700 text-sm font-medium"
                      >
                        Details
                      </button>
                    </div>
                    <button
                      onClick={() => handleDeleteVideo(video.id)}
                      className="text-red-600 hover:text-red-700 text-sm font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Video Details Modal */}
      {selectedVideo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">Video Details</h3>
                <button
                  onClick={() => setSelectedVideo(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="px-6 py-4 overflow-y-auto max-h-96">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900">{selectedVideo.title}</h4>
                  <p className="text-sm text-gray-600">Status: {selectedVideo.status}</p>
                </div>
                
                {selectedVideo.book_title && (
                  <div>
                    <h5 className="font-medium text-gray-900 mb-1">Book</h5>
                    <p className="text-sm text-gray-600">{selectedVideo.book_title}</p>
                  </div>
                )}

                {selectedVideo.script && (
                  <div>
                    <h5 className="font-medium text-gray-900 mb-1">Script</h5>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedVideo.script}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-900">Created:</span>
                    <p className="text-gray-600">{new Date(selectedVideo.created_at).toLocaleString()}</p>
                  </div>
                  {selectedVideo.updated_at && (
                    <div>
                      <span className="font-medium text-gray-900">Updated:</span>
                      <p className="text-gray-600">{new Date(selectedVideo.updated_at).toLocaleString()}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setSelectedVideo(null)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Close
                </button>
                {selectedVideo.status === 'completed' && (
                  <button
                    onClick={() => {
                      handleDownloadVideo(selectedVideo.id);
                      setSelectedVideo(null);
                    }}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                  >
                    Download Video
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoLibrary;
