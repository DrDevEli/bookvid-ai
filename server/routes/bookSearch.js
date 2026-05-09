/**
 * Book Search Routes
 * Handles book search functionality using Google Books and Open Library APIs
 */

const express = require('express');
const { query, param } = require('express-validator');
const { validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const bookSearchService = require('../services/bookSearchService');

const router = express.Router();

/**
 * Validation rules for search
 */
const searchValidation = [
  query('q')
    .notEmpty()
    .withMessage('Search query is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Search query must be between 2 and 100 characters'),
  
  query('maxResults')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Max results must be between 1 and 50'),
  
  query('searchType')
    .optional()
    .isIn(['all', 'title', 'author', 'isbn'])
    .withMessage('Invalid search type')
];

/**
 * GET /api/book-search/search
 * Search books using both Google Books and Open Library APIs
 */
router.get('/search', authenticateToken, searchValidation, async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { q, maxResults = 20, searchType = 'all' } = req.query;
    
    const results = await bookSearchService.searchBooks(q, {
      maxResults: parseInt(maxResults),
      searchType
    });

    res.json({
      success: true,
      query: q,
      results,
      count: results.length,
      searchType
    });

  } catch (error) {
    console.error('Book search error:', error);
    res.status(500).json({
      error: 'Search failed',
      message: error.message
    });
  }
});

/**
 * GET /api/book-search/genre/:genre
 * Search books by genre/category
 */
router.get('/genre/:genre', authenticateToken, async (req, res) => {
  try {
    const { genre } = req.params;
    const { maxResults = 20 } = req.query;
    
    if (!genre || genre.length < 2) {
      return res.status(400).json({
        error: 'Genre must be at least 2 characters'
      });
    }

    const results = await bookSearchService.searchByGenre(genre, {
      maxResults: parseInt(maxResults)
    });

    res.json({
      success: true,
      genre,
      results,
      count: results.length
    });

  } catch (error) {
    console.error('Genre search error:', error);
    res.status(500).json({
      error: 'Genre search failed',
      message: error.message
    });
  }
});

/**
 * GET /api/book-search/details/:source/:bookId
 * Get detailed book information
 */
router.get('/details/:source/:bookId', authenticateToken, async (req, res) => {
  try {
    const { source, bookId } = req.params;
    
    if (!['google', 'openlibrary'].includes(source)) {
      return res.status(400).json({
        error: 'Invalid source. Must be "google" or "openlibrary"'
      });
    }

    if (!bookId) {
      return res.status(400).json({
        error: 'Book ID is required'
      });
    }

    const bookDetails = await bookSearchService.getBookDetails(bookId, source);

    res.json({
      success: true,
      book: bookDetails
    });

  } catch (error) {
    console.error('Get book details error:', error);
    res.status(500).json({
      error: 'Failed to get book details',
      message: error.message
    });
  }
});

/**
 * GET /api/book-search/suggestions
 * Get search suggestions
 */
router.get('/suggestions', authenticateToken, async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.length < 2) {
      return res.json({
        success: true,
        suggestions: []
      });
    }

    const suggestions = await bookSearchService.getSearchSuggestions(q);

    res.json({
      success: true,
      suggestions
    });

  } catch (error) {
    console.error('Get suggestions error:', error);
    res.status(500).json({
      error: 'Failed to get suggestions',
      message: error.message
    });
  }
});

/**
 * GET /api/book-search/genres
 * Get popular genres/categories
 */
router.get('/genres', authenticateToken, async (req, res) => {
  try {
    const popularGenres = [
      'Fiction',
      'Non-fiction',
      'Mystery',
      'Romance',
      'Science Fiction',
      'Fantasy',
      'Thriller',
      'Biography',
      'History',
      'Self-Help',
      'Business',
      'Technology',
      'Health',
      'Cooking',
      'Travel',
      'Art',
      'Philosophy',
      'Psychology',
      'Education',
      'Children\'s Books'
    ];

    res.json({
      success: true,
      genres: popularGenres
    });

  } catch (error) {
    console.error('Get genres error:', error);
    res.status(500).json({
      error: 'Failed to get genres',
      message: error.message
    });
  }
});

/**
 * GET /api/book-search/cache/stats
 * Get cache statistics
 */
router.get('/cache/stats', authenticateToken, async (req, res) => {
  try {
    const stats = bookSearchService.getCacheStats();

    res.json({
      success: true,
      cache: stats
    });

  } catch (error) {
    console.error('Get cache stats error:', error);
    res.status(500).json({
      error: 'Failed to get cache stats',
      message: error.message
    });
  }
});

/**
 * POST /api/book-search/cache/clear
 * Clear search cache
 */
router.post('/cache/clear', authenticateToken, async (req, res) => {
  try {
    bookSearchService.clearCache();

    res.json({
      success: true,
      message: 'Cache cleared successfully'
    });

  } catch (error) {
    console.error('Clear cache error:', error);
    res.status(500).json({
      error: 'Failed to clear cache',
      message: error.message
    });
  }
});

/**
 * GET /api/book-search/health
 * Check search service health
 */
router.get('/health', authenticateToken, async (req, res) => {
  try {
    const googleBooksApiKey = process.env.GOOGLE_BOOKS_API_KEY;
    
    res.json({
      success: true,
      services: {
        googleBooks: {
          available: !!googleBooksApiKey,
          hasApiKey: !!googleBooksApiKey
        },
        openLibrary: {
          available: true,
          hasApiKey: false
        }
      },
      cache: bookSearchService.getCacheStats()
    });

  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      error: 'Health check failed',
      message: error.message
    });
  }
});

module.exports = router;
