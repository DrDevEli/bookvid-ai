import api from './apiClient';

const bookSearchService = {
  // Search books by query
  searchBooks: async (query, options = {}) => {
    const response = await api.get('/book-search/search', {
      params: {
        q: query,
        maxResults: options.maxResults || 20,
        searchType: options.searchType || 'all'
      }
    });
    return response;
  },

  // Search books by genre
  searchByGenre: async (genre, options = {}) => {
    const response = await api.get(`/book-search/genre/${encodeURIComponent(genre)}`, {
      params: {
        maxResults: options.maxResults || 20
      }
    });
    return response;
  },

  // Get detailed book information
  getBookDetails: async (bookId, source) => {
    const response = await api.get(`/book-search/details/${source}/${bookId}`);
    return response;
  },

  // Get search suggestions
  getSuggestions: async (query) => {
    if (!query || query.length < 2) {
      return { suggestions: [] };
    }
    
    const response = await api.get('/book-search/suggestions', {
      params: { q: query }
    });
    return response;
  },

  // Get popular genres
  getGenres: async () => {
    const response = await api.get('/book-search/genres');
    return response;
  },

  // Get cache statistics
  getCacheStats: async () => {
    const response = await api.get('/book-search/cache/stats');
    return response;
  },

  // Clear search cache
  clearCache: async () => {
    const response = await api.post('/book-search/cache/clear');
    return response;
  },

  // Check search service health
  getHealth: async () => {
    const response = await api.get('/book-search/health');
    return response;
  }
};

export default bookSearchService;
