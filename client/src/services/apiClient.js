import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Create enhanced axios instance with timeout and retry logic
const api = axios.create({
  baseURL: API_URL,
  timeout: 30000, // 30 seconds timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor with logging
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Development logging
    if (import.meta.env.DEV) {
      console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`);
    }
    
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor with retry logic and enhanced error handling
api.interceptors.response.use(
  (response) => {
    // Development logging
    if (import.meta.env.DEV) {
      console.log(`✅ API Response: ${response.status} ${response.config.url}`);
    }
    return response.data;
  },
  async (error) => {
    const config = error.config;
    
    // Log error
    if (import.meta.env.DEV) {
      console.log(`❌ API Error: ${error.response?.status} ${error.config?.url}`);
    }
    
    // Handle 401 errors (authentication)
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
      return Promise.reject(error);
    }
    
    // Retry logic for network errors
    if (!error.response && config && config.__retryCount < 3) {
      config.__retryCount = (config.__retryCount || 0) + 1;
      
      // Exponential backoff
      const delay = Math.pow(2, config.__retryCount) * 1000;
      console.log(`🔄 Retrying request in ${delay}ms (attempt ${config.__retryCount})`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
      return api(config);
    }
    
    // Enhanced error object
    const enhancedError = {
      message: error.response?.data?.message || error.message || 'An unexpected error occurred',
      code: error.response?.data?.code || `HTTP_${error.response?.status}` || 'NETWORK_ERROR',
      status: error.response?.status,
      details: error.response?.data?.details,
      originalError: error
    };
    
    return Promise.reject(enhancedError);
  }
);

export default api;
