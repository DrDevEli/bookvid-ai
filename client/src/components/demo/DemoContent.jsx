import React, { useState } from 'react';
import { BookOpen, Video, Play, Download, Eye, Clock } from 'lucide-react';
import demoService from '../../services/demoService';

const DemoContent = () => {
  const [books] = useState(demoService.getDemoBooks());
  const [videos] = useState(demoService.getDemoVideos());
  const [templates] = useState(demoService.getDemoTemplates());
  const [activeTab, setActiveTab] = useState('books');

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'generating':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('books')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'books'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <BookOpen className="inline-block w-4 h-4 mr-2" />
            Sample Books ({books.length})
          </button>
          <button
            onClick={() => setActiveTab('videos')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'videos'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Video className="inline-block w-4 h-4 mr-2" />
            Generated Videos ({videos.length})
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'templates'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Eye className="inline-block w-4 h-4 mr-2" />
            Templates ({templates.length})
          </button>
        </nav>
      </div>

      {/* Books Tab */}
      {activeTab === 'books' && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {books.map((book) => (
            <div key={book.id} className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="h-48 bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                <BookOpen className="h-16 w-16 text-white" />
              </div>
              <div className="p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{book.title}</h3>
                <p className="text-sm text-gray-600 mb-2">by {book.author}</p>
                <p className="text-xs text-gray-500 mb-3">{book.genre}</p>
                <p className="text-sm text-gray-700 mb-4 line-clamp-3">{book.description}</p>
                <div className="flex justify-between items-center">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    book.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {book.status}
                  </span>
                  <button className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">
                    Generate Video
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Videos Tab */}
      {activeTab === 'videos' && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {videos.map((video) => (
            <div key={video.id} className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="h-48 bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center relative">
                <Play className="h-16 w-16 text-white" />
                {video.duration && (
                  <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                    {formatDuration(video.duration)}
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{video.title}</h3>
                <p className="text-sm text-gray-700 mb-3 line-clamp-2">{video.script}</p>
                <div className="flex justify-between items-center mb-3">
                  <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(video.status)}`}>
                    {video.status}
                  </span>
                  {video.progress && video.status === 'generating' && (
                    <div className="flex items-center text-xs text-gray-500">
                      <Clock className="h-3 w-3 mr-1" />
                      {video.progress}%
                    </div>
                  )}
                </div>
                <div className="flex space-x-2">
                  {video.status === 'completed' && (
                    <>
                      <button className="flex-1 bg-indigo-600 text-white px-3 py-2 rounded text-sm hover:bg-indigo-700">
                        <Play className="inline-block w-3 h-3 mr-1" />
                        Preview
                      </button>
                      <button className="flex-1 border border-gray-300 text-gray-700 px-3 py-2 rounded text-sm hover:bg-gray-50">
                        <Download className="inline-block w-3 h-3 mr-1" />
                        Download
                      </button>
                    </>
                  )}
                  {video.status === 'generating' && (
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${video.progress || 0}%` }}
                      ></div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {templates.map((template) => (
            <div key={template.id} className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="h-32 bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center">
                <Video className="h-8 w-8 text-white" />
              </div>
              <div className="p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-1">{template.name}</h3>
                <p className="text-xs text-gray-600 mb-2">{template.category}</p>
                <p className="text-xs text-gray-500 mb-3 line-clamp-2">{template.description}</p>
                <button className="w-full bg-gray-100 text-gray-700 px-3 py-2 rounded text-xs hover:bg-gray-200">
                  Use Template
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Demo Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <Eye className="h-5 w-5 text-blue-600 mt-0.5 mr-3" />
          <div>
            <h3 className="text-sm font-medium text-blue-900 mb-1">
              Demo Content
            </h3>
            <p className="text-sm text-blue-700">
              This is sample content for portfolio demonstration. In a real application, 
              you would upload your own books and generate actual videos using AI services.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DemoContent;