import api from './apiClient';

const videoService = {
  // Get all books for the user
  getBooks: async (params = {}) => {
    const response = await api.get('/books', { params });
    return response;
  },

  // Get single book
  getBook: async (bookId) => {
    const response = await api.get(`/books/${bookId}`);
    return response;
  },

  // Create new book
  createBook: async (bookData) => {
    const response = await api.post('/books', bookData);
    return response;
  },

  // Update book
  updateBook: async (bookId, bookData) => {
    const response = await api.put(`/books/${bookId}`, bookData);
    return response;
  },

  // Delete book
  deleteBook: async (bookId) => {
    const response = await api.delete(`/books/${bookId}`);
    return response;
  },

  // Get video generation templates
  getTemplates: async (params = {}) => {
    const response = await api.get('/video-generation/templates', { params });
    return response;
  },

  // Get specific template
  getTemplate: async (templateId) => {
    const response = await api.get(`/video-generation/templates/${templateId}`);
    return response;
  },

  // Get available voices
  getVoices: async () => {
    const response = await api.get('/video-generation/voices');
    return response;
  },

  // Preview script without starting full workflow
  previewScript: async (bookId, options = {}) => {
    const response = await api.post('/video-generation/preview-script', {
      bookId,
      options
    });
    return response;
  },

  // Start video generation workflow
  startVideoGeneration: async (bookId, templateId, options = {}) => {
    const response = await api.post('/video-generation/start', {
      bookId,
      templateId,
      options
    });
    return response;
  },

  // Get workflow status
  getWorkflowStatus: async (workflowId) => {
    const response = await api.get(`/video-generation/status/${workflowId}`);
    return response;
  },

  // Cancel workflow
  cancelWorkflow: async (workflowId) => {
    const response = await api.post(`/video-generation/cancel/${workflowId}`);
    return response;
  },

  // Get service status
  getServiceStatus: async () => {
    const response = await api.get('/video-generation/service-status');
    return response;
  },

  // Get workflow statistics
  getWorkflowStats: async () => {
    const response = await api.get('/video-generation/stats');
    return response;
  },

  // Get render job status
  getRenderStatus: async (jobId) => {
    const response = await api.get(`/video-generation/render/${jobId}`);
    return response;
  },

  // Cancel render job
  cancelRenderJob: async (jobId) => {
    const response = await api.post(`/video-generation/render/${jobId}/cancel`);
    return response;
  },

  // Get all videos for user
  getVideos: async (params = {}) => {
    const response = await api.get('/videos', { params });
    return response;
  },

  // Get single video
  getVideo: async (videoId) => {
    const response = await api.get(`/videos/${videoId}`);
    return response;
  },

  // Delete video
  deleteVideo: async (videoId) => {
    const response = await api.delete(`/videos/${videoId}`);
    return response;
  },

  // Download video
  downloadVideo: async (videoId) => {
    const response = await api.get(`/videos/${videoId}/download`, {
      responseType: 'blob'
    });
    return response;
  }
};

export default videoService;
