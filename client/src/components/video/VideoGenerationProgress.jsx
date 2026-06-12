import React, { useState, useEffect } from 'react';
import videoService from '../../services/videoService';

const VideoGenerationProgress = ({ workflowId, onComplete, onError }) => {
  const [workflow, setWorkflow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [polling, setPolling] = useState(true);

  useEffect(() => {
    if (workflowId) {
      startPolling();
    }
    return () => setPolling(false);
  }, [workflowId]);

  const startPolling = () => {
    const pollInterval = setInterval(async () => {
      if (!polling) {
        clearInterval(pollInterval);
        return;
      }

      try {
        const response = await videoService.getWorkflowStatus(workflowId);
        setWorkflow(response.workflow);
        setLoading(false);

        if (response.workflow.status === 'completed') {
          setPolling(false);
          clearInterval(pollInterval);
          onComplete(response.workflow);
        } else if (response.workflow.status === 'failed') {
          setPolling(false);
          clearInterval(pollInterval);
          setError(response.workflow.error);
          onError(response.workflow.error);
        }
      } catch (err) {
        console.error('Polling error:', err);
        setError('Failed to get workflow status');
        setPolling(false);
        clearInterval(pollInterval);
      }
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(pollInterval);
  };

  const handleCancel = async () => {
    try {
      await videoService.cancelWorkflow(workflowId);
      setPolling(false);
      onError('Workflow cancelled by user');
    } catch (err) {
      console.error('Cancel workflow error:', err);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'starting':
      case 'processing':
        return 'text-blue-600';
      case 'completed':
        return 'text-green-600';
      case 'failed':
      case 'cancelled':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'starting':
      case 'processing':
        return (
          <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        );
      case 'completed':
        return (
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      case 'failed':
      case 'cancelled':
        return (
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        );
      default:
        return null;
    }
  };

  if (loading && !workflow) {
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

  if (!workflow) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center">
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Generation</h3>
          <p className="text-gray-500">Start a new video generation to see progress here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">Video Generation Progress</h3>
          <div className="flex items-center space-x-2">
            <span className={`text-sm font-medium ${getStatusColor(workflow.status)}`}>
              {workflow.status.charAt(0).toUpperCase() + workflow.status.slice(1)}
            </span>
            {getStatusIcon(workflow.status)}
          </div>
        </div>
      </div>

      <div className="p-6">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Progress</span>
            <span>{Math.round(workflow.progress || 0)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${workflow.progress || 0}%` }}
            ></div>
          </div>
        </div>

        {/* Current Step */}
        {workflow.currentStepName && (
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Current Step</h4>
            <p className="text-sm text-gray-600">{workflow.currentStepName}</p>
          </div>
        )}

        {/* Steps List */}
        {workflow.steps && (
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Generation Steps</h4>
            <div className="space-y-2">
              {workflow.steps.map((step, index) => (
                <div
                  key={index}
                  className={`flex items-center space-x-3 p-2 rounded-md ${
                    index < workflow.currentStep
                      ? 'bg-green-50 text-green-700'
                      : index === workflow.currentStep
                      ? 'bg-blue-50 text-blue-700'
                      : 'bg-gray-50 text-gray-500'
                  }`}
                >
                  <div className="flex-shrink-0">
                    {index < workflow.currentStep ? (
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    ) : index === workflow.currentStep ? (
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <div className="h-5 w-5 rounded-full border-2 border-gray-300"></div>
                    )}
                  </div>
                  <span className="text-sm">{step}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Results Summary */}
        {workflow.results && (
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Generation Results</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-gray-50 rounded-md">
                <div className="text-lg font-semibold text-gray-900">
                  {workflow.results.scriptGenerated ? '✓' : '○'}
                </div>
                <div className="text-xs text-gray-600">Script</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-md">
                <div className="text-lg font-semibold text-gray-900">
                  {workflow.results.voiceoverGenerated ? '✓' : '○'}
                </div>
                <div className="text-xs text-gray-600">Voiceover</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-md">
                <div className="text-lg font-semibold text-gray-900">
                  {workflow.results.videoCreated ? '✓' : '○'}
                </div>
                <div className="text-xs text-gray-600">Video</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-md">
                <div className="text-lg font-semibold text-gray-900">
                  {workflow.results.videoId ? workflow.results.videoId.slice(-4) : '○'}
                </div>
                <div className="text-xs text-gray-600">ID</div>
              </div>
            </div>
          </div>
        )}

        {/* Render Progress */}
        {workflow.renderProgress && (
          <div className="mb-6 p-4 bg-blue-50 rounded-md">
            <h4 className="text-sm font-medium text-blue-900 mb-2">Video Rendering</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-blue-700">Render Progress</span>
                <span className="text-blue-700">{workflow.renderProgress.progress}%</span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${workflow.renderProgress.progress}%` }}
                ></div>
              </div>
              {workflow.renderProgress.currentStep && (
                <p className="text-sm text-blue-700">{workflow.renderProgress.currentStep}</p>
              )}
              {workflow.renderProgress.estimatedTimeRemaining && (
                <p className="text-sm text-blue-600">
                  Estimated time remaining: {workflow.renderProgress.estimatedTimeRemaining}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-500">
            Started: {new Date(workflow.startedAt).toLocaleString()}
          </div>
          {workflow.status === 'starting' || workflow.status === 'processing' ? (
            <button
              onClick={handleCancel}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Cancel Generation
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default VideoGenerationProgress;
