import React, { useState, useEffect } from 'react';
import videoService from '../../services/videoService';

const VideoGenerationForm = ({ selectedBook, onGenerationStart }) => {
  const [templates, setTemplates] = useState([]);
  const [voices, setVoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [previewScript, setPreviewScript] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  const [formData, setFormData] = useState({
    templateId: '',
    duration: 60,
    tone: 'engaging',
    voiceId: '',
    stability: 0.5,
    similarityBoost: 0.5
  });

  const toneOptions = [
    { value: 'engaging', label: 'Engaging' },
    { value: 'professional', label: 'Professional' },
    { value: 'casual', label: 'Casual' },
    { value: 'dramatic', label: 'Dramatic' },
    { value: 'informative', label: 'Informative' }
  ];

  useEffect(() => {
    loadTemplates();
    loadVoices();
  }, []);

  const loadTemplates = async () => {
    try {
      const response = await videoService.getTemplates();
      setTemplates(response.templates || []);
    } catch (err) {
      console.error('Load templates error:', err);
    }
  };

  const loadVoices = async () => {
    try {
      const response = await videoService.getVoices();
      setVoices(response.voices || []);
    } catch (err) {
      console.error('Load voices error:', err);
    }
  };

  const handlePreviewScript = async () => {
    if (!selectedBook) return;

    try {
      setLoading(true);
      setError(null);
      const response = await videoService.previewScript(selectedBook.id, {
        duration: formData.duration,
        tone: formData.tone
      });
      setPreviewScript(response.script);
      setShowPreview(true);
    } catch (err) {
      setError('Failed to generate script preview');
      console.error('Preview script error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartGeneration = async () => {
    if (!selectedBook) return;

    try {
      setLoading(true);
      setError(null);
      const response = await videoService.startVideoGeneration(
        selectedBook.id,
        formData.templateId,
        {
          duration: formData.duration,
          tone: formData.tone,
          voiceId: formData.voiceId,
          stability: formData.stability,
          similarityBoost: formData.similarityBoost
        }
      );
      
      onGenerationStart(response.workflow);
    } catch (err) {
      setError('Failed to start video generation');
      console.error('Start generation error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (!selectedBook) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center">
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Book</h3>
          <p className="text-gray-500">Choose a book from your library to start generating a video</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Generate Video</h3>
        <p className="text-sm text-gray-600">Create a promotional video for "{selectedBook.title}"</p>
      </div>

      <div className="p-6">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="space-y-6">
          {/* Template Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Video Template
            </label>
            <select
              value={formData.templateId}
              onChange={(e) => handleInputChange('templateId', e.target.value)}
              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option key="auto-template" value="">Auto-select based on genre</option>
              {templates.map((template, index) => (
                <option key={template.id || `template-${index}`} value={template.id}>
                  {template.name} - {template.description}
                </option>
              ))}
            </select>
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Video Duration (seconds)
            </label>
            <input
              type="number"
              min="30"
              max="300"
              value={formData.duration}
              onChange={(e) => handleInputChange('duration', parseInt(e.target.value))}
              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
            <p className="mt-1 text-sm text-gray-500">Recommended: 60-120 seconds</p>
          </div>

          {/* Tone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Script Tone
            </label>
            <select
              value={formData.tone}
              onChange={(e) => handleInputChange('tone', e.target.value)}
              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
            >
              {toneOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Voice Selection */}
          {voices.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Voice
              </label>
              <select
                value={formData.voiceId}
                onChange={(e) => handleInputChange('voiceId', e.target.value)}
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option key="auto-voice" value="">Auto-select voice</option>
                {voices.map((voice, index) => (
                  <option key={voice.voice_id || `voice-${index}`} value={voice.voice_id}>
                    {voice.name} ({voice.gender}, {voice.accent})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Voice Settings */}
          {formData.voiceId && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Voice Stability
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={formData.stability}
                  onChange={(e) => handleInputChange('stability', parseFloat(e.target.value))}
                  className="w-full"
                />
                <p className="text-sm text-gray-500">Lower = more variable, Higher = more consistent</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Similarity Boost
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={formData.similarityBoost}
                  onChange={(e) => handleInputChange('similarityBoost', parseFloat(e.target.value))}
                  className="w-full"
                />
                <p className="text-sm text-gray-500">How closely to match the original voice</p>
              </div>
            </div>
          )}

          {/* Preview Script */}
          <div className="flex space-x-3">
            <button
              onClick={handlePreviewScript}
              disabled={loading}
              className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Generating...' : 'Preview Script'}
            </button>
            <button
              onClick={handleStartGeneration}
              disabled={loading}
              className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Starting...' : 'Generate Video'}
            </button>
          </div>
        </div>

        {/* Script Preview Modal */}
        {showPreview && previewScript && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900">Script Preview</h3>
                  <button
                    onClick={() => setShowPreview(false)}
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
                    <h4 className="font-medium text-gray-900">{previewScript.title}</h4>
                    <p className="text-sm text-gray-600">by {selectedBook.author}</p>
                  </div>
                  <div className="prose max-w-none">
                    <p className="text-gray-700 whitespace-pre-wrap">{previewScript.mainContent}</p>
                  </div>
                  {previewScript.keyPoints && previewScript.keyPoints.length > 0 && (
                    <div>
                      <h5 className="font-medium text-gray-900 mb-2">Key Points:</h5>
                      <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                        {previewScript.keyPoints.map((point, index) => (
                          <li key={`keypoint-${index}-${point.substring(0, 20)}`}>{point}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowPreview(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      setShowPreview(false);
                      handleStartGeneration();
                    }}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                  >
                    Generate Video
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoGenerationForm;
