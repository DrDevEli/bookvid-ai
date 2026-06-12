import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { logout, selectUser, selectStats, selectIsDemoMode, exitDemoMode } from '../store/slices/authSlice';
import AuthGuard from '../components/auth/AuthGuard';
import DemoModeIndicator from '../components/demo/DemoModeIndicator';
import DemoContent from '../components/demo/DemoContent';
import BookManager from '../components/video/BookManager';
import VideoGenerationForm from '../components/video/VideoGenerationForm';
import VideoGenerationProgress from '../components/video/VideoGenerationProgress';
import VideoLibrary from '../components/video/VideoLibrary';
import ErrorBoundary from '../components/ErrorBoundary';
import HealthService from '../services/healthService';
import { useNavigate } from 'react-router-dom';

const DashboardPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector(selectUser);
  const stats = useSelector(selectStats);
  const isDemoMode = useSelector(selectIsDemoMode);

  // Video generation state
  const [selectedBook, setSelectedBook] = useState(null);
  const [activeWorkflow, setActiveWorkflow] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState('unknown');

  const handleLogout = () => {
    dispatch(logout());
    navigate('/');
  };

  const handleExitDemo = () => {
    dispatch(exitDemoMode());
    navigate('/');
  };

  // Video generation handlers
  const handleBookSelect = (book) => {
    setSelectedBook(book);
  };

  const handleGenerationStart = (workflow) => {
    setActiveWorkflow(workflow);
    setRefreshTrigger(prev => prev + 1);
  };

  const handleGenerationComplete = (workflow) => {
    setActiveWorkflow(null);
    setRefreshTrigger(prev => prev + 1);
  };

  const handleGenerationError = (error) => {
    setActiveWorkflow(null);
    console.error('Generation error:', error);
  };

  // Health monitoring setup
  useEffect(() => {
    if (!isDemoMode) {
      // Start health monitoring
      HealthService.startHealthMonitoring(30000); // Check every 30 seconds
      
      // Listen for health status changes
      const removeListener = HealthService.addListener((healthData) => {
        setConnectionStatus(healthData.status);
        
        if (healthData.status !== 'healthy') {
          HealthService.showConnectionWarning(healthData);
        }
      });
      
      return () => {
        removeListener();
        HealthService.stopHealthMonitoring();
      };
    }
  }, [isDemoMode]);

  return (
    <ErrorBoundary>
      <AuthGuard requireAuth={true}>
        <div className="min-h-screen bg-gray-50">
        <DemoModeIndicator onExitDemo={handleExitDemo} />
        {/* Header */}
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div>
                <div className="flex items-center">
                  <h1 className="text-3xl font-bold text-gray-900">BookVid AI</h1>
                  <span className="ml-3 px-2 py-1 text-xs bg-indigo-100 text-indigo-800 rounded-full">
                    Personal Project
                  </span>
                </div>
                <p className="text-gray-600">Welcome back, {user?.username}!</p>
              </div>
              <button
                onClick={handleLogout}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            {/* Stats Cards */}
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-sm font-bold">B</span>
                        </div>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            Books
                          </dt>
                          <dd className="text-lg font-medium text-gray-900">
                            {stats.books}
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-sm font-bold">V</span>
                        </div>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            Videos
                          </dt>
                          <dd className="text-lg font-medium text-gray-900">
                            {stats.videos}
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-sm font-bold">C</span>
                        </div>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            Completed
                          </dt>
                          <dd className="text-lg font-medium text-gray-900">
                            {stats.completedVideos}
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-sm font-bold">%</span>
                        </div>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            Success Rate
                          </dt>
                          <dd className="text-lg font-medium text-gray-900">
                            {stats.successRate}%
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Welcome Message */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Personal BookVid AI Dashboard
              </h2>
              <p className="text-gray-600 mb-4">
                Welcome to your personal video creation workspace. This is a portfolio demonstration 
                of AI-powered video generation capabilities.
              </p>
              <div className="space-y-2">
                <p className="text-sm text-gray-500">
                  • Upload your book content and generate engaging video scripts with AI
                </p>
                <p className="text-sm text-gray-500">
                  • Choose from various templates and customize your videos
                </p>
                <p className="text-sm text-gray-500">
                  • Generate professional voiceovers using Resemble AI
                </p>
                <p className="text-sm text-gray-500">
                  • Download and share your completed videos
                </p>
                <p className="text-sm text-gray-500">
                  • No usage limits - create as many videos as you want
                </p>
              </div>
              
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h3 className="text-sm font-medium text-blue-900 mb-2">
                  Portfolio Project Notice
                </h3>
                <p className="text-sm text-blue-700">
                  This is a personal project showcasing full-stack development and AI integration. 
                  All features are available for demonstration and personal use.
                </p>
              </div>
            </div>

            {/* Demo Content */}
            {isDemoMode && (
              <div className="mt-8">
                <DemoContent />
              </div>
            )}

            {/* Video Generation Interface for Non-Demo Mode */}
            {!isDemoMode && (
              <div className="mt-8 space-y-8">
                {/* Book Management */}
                <BookManager 
                  onBookSelect={handleBookSelect}
                  selectedBook={selectedBook}
                />

                {/* Video Generation Form */}
                <VideoGenerationForm 
                  selectedBook={selectedBook}
                  onGenerationStart={handleGenerationStart}
                />

                {/* Active Generation Progress */}
                {activeWorkflow && (
                  <VideoGenerationProgress 
                    workflowId={activeWorkflow.workflowId}
                    onComplete={handleGenerationComplete}
                    onError={handleGenerationError}
                  />
                )}

                {/* Video Library */}
                <VideoLibrary 
                  refreshTrigger={refreshTrigger}
                />
              </div>
            )}
          </div>
        </main>
        </div>
      </AuthGuard>
    </ErrorBoundary>
  );
};

export default DashboardPage;