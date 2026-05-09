/**
 * Book Search Service
 * Integrates Google Books API and Open Library API for comprehensive book search
 */

const axios = require('axios');
const NodeCache = require('node-cache');

class BookSearchService {
  constructor() {
    this.googleBooksApiKey = process.env.GOOGLE_BOOKS_API_KEY;
    this.cache = new NodeCache({ stdTTL: 3600 }); // 1 hour cache
    this.searchCache = new NodeCache({ stdTTL: 1800 }); // 30 minutes for search results
  }

  /**
   * Search books using both Google Books and Open Library APIs
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Promise<Array>} Combined search results
   */
  async searchBooks(query, options = {}) {
    const { maxResults = 20, searchType = 'all' } = options;
    
    // Check cache first
    const cacheKey = `search_${query}_${maxResults}_${searchType}`;
    const cachedResults = this.searchCache.get(cacheKey);
    if (cachedResults) {
      return cachedResults;
    }

    try {
      // Search both APIs in parallel
      const [googleResults, openLibraryResults] = await Promise.allSettled([
        this.searchGoogleBooks(query, { maxResults: Math.ceil(maxResults / 2) }),
        this.searchOpenLibrary(query, { maxResults: Math.ceil(maxResults / 2) })
      ]);

      // Combine and deduplicate results
      let combinedResults = [];
      
      if (googleResults.status === 'fulfilled') {
        combinedResults = [...combinedResults, ...googleResults.value];
      }
      
      if (openLibraryResults.status === 'fulfilled') {
        combinedResults = [...combinedResults, ...openLibraryResults.value];
      }

      // Deduplicate by ISBN or title+author
      const deduplicatedResults = this.deduplicateResults(combinedResults);
      
      // Sort by relevance and limit results
      const sortedResults = this.sortByRelevance(deduplicatedResults, query).slice(0, maxResults);
      
      // Cache results
      this.searchCache.set(cacheKey, sortedResults);
      
      return sortedResults;
    } catch (error) {
      console.error('Book search error:', error);
      throw new Error('Failed to search books');
    }
  }

  /**
   * Search Google Books API
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Promise<Array>} Google Books results
   */
  async searchGoogleBooks(query, options = {}) {
    const { maxResults = 10 } = options;
    
    try {
      const response = await axios.get('https://www.googleapis.com/books/v1/volumes', {
        params: {
          q: query,
          maxResults,
          key: this.googleBooksApiKey,
          printType: 'books'
        }
      });

      return response.data.items?.map(item => this.formatGoogleBookResult(item)) || [];
    } catch (error) {
      console.error('Google Books API error:', error);
      return [];
    }
  }

  /**
   * Search Open Library API
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Promise<Array>} Open Library results
   */
  async searchOpenLibrary(query, options = {}) {
    const { maxResults = 10 } = options;
    
    try {
      const response = await axios.get('https://openlibrary.org/search.json', {
        params: {
          q: query,
          limit: maxResults,
          fields: 'title,author_name,first_publish_year,isbn,subject,cover_i,key'
        }
      });

      return response.data.docs?.map(doc => this.formatOpenLibraryResult(doc)) || [];
    } catch (error) {
      console.error('Open Library API error:', error);
      return [];
    }
  }

  /**
   * Search books by genre/category
   * @param {string} genre - Genre to search for
   * @param {Object} options - Search options
   * @returns {Promise<Array>} Genre search results
   */
  async searchByGenre(genre, options = {}) {
    const { maxResults = 20 } = options;
    
    // Try both APIs with genre-specific queries
    const genreQueries = [
      `subject:${genre}`,
      `"${genre}" fiction`,
      `"${genre}" books`
    ];

    const searchPromises = genreQueries.map(query => 
      this.searchBooks(query, { maxResults: Math.ceil(maxResults / genreQueries.length) })
    );

    try {
      const results = await Promise.all(searchPromises);
      const combinedResults = results.flat();
      
      // Deduplicate and sort
      const deduplicatedResults = this.deduplicateResults(combinedResults);
      return this.sortByRelevance(deduplicatedResults, genre).slice(0, maxResults);
    } catch (error) {
      console.error('Genre search error:', error);
      throw new Error('Failed to search books by genre');
    }
  }

  /**
   * Get detailed book information
   * @param {string} bookId - Book identifier
   * @param {string} source - Source API ('google' or 'openlibrary')
   * @returns {Promise<Object>} Detailed book information
   */
  async getBookDetails(bookId, source) {
    const cacheKey = `book_${source}_${bookId}`;
    const cachedBook = this.cache.get(cacheKey);
    if (cachedBook) {
      return cachedBook;
    }

    try {
      let bookDetails;
      
      if (source === 'google') {
        bookDetails = await this.getGoogleBookDetails(bookId);
      } else if (source === 'openlibrary') {
        bookDetails = await this.getOpenLibraryBookDetails(bookId);
      } else {
        throw new Error('Invalid source');
      }

      // Cache the result
      this.cache.set(cacheKey, bookDetails);
      
      return bookDetails;
    } catch (error) {
      console.error('Get book details error:', error);
      throw new Error('Failed to get book details');
    }
  }

  /**
   * Get detailed information from Google Books
   * @param {string} bookId - Google Books volume ID
   * @returns {Promise<Object>} Book details
   */
  async getGoogleBookDetails(bookId) {
    try {
      const response = await axios.get(`https://www.googleapis.com/books/v1/volumes/${bookId}`, {
        params: {
          key: this.googleBooksApiKey
        }
      });

      return this.formatGoogleBookResult(response.data, true);
    } catch (error) {
      console.error('Google Books details error:', error);
      throw new Error('Failed to get Google Books details');
    }
  }

  /**
   * Get detailed information from Open Library
   * @param {string} bookId - Open Library work key
   * @returns {Promise<Object>} Book details
   */
  async getOpenLibraryBookDetails(bookId) {
    try {
      const response = await axios.get(`https://openlibrary.org${bookId}.json`);
      return this.formatOpenLibraryResult(response.data, true);
    } catch (error) {
      console.error('Open Library details error:', error);
      throw new Error('Failed to get Open Library details');
    }
  }

  /**
   * Format Google Books API result
   * @param {Object} item - Google Books item
   * @param {boolean} isDetailed - Whether this is a detailed result
   * @returns {Object} Formatted book result
   */
  formatGoogleBookResult(item, isDetailed = false) {
    const volumeInfo = item.volumeInfo || {};
    const saleInfo = item.saleInfo || {};
    
    return {
      id: item.id,
      source: 'google',
      title: volumeInfo.title || 'Unknown Title',
      authors: volumeInfo.authors || ['Unknown Author'],
      author: volumeInfo.authors?.[0] || 'Unknown Author',
      description: volumeInfo.description || '',
      isbn: this.extractISBN(volumeInfo.industryIdentifiers),
      publishedDate: volumeInfo.publishedDate || '',
      publisher: volumeInfo.publisher || '',
      pageCount: volumeInfo.pageCount || 0,
      categories: volumeInfo.categories || [],
      genre: volumeInfo.categories?.[0] || 'General',
      language: volumeInfo.language || 'en',
      thumbnail: volumeInfo.imageLinks?.thumbnail || '',
      coverImage: volumeInfo.imageLinks?.medium || volumeInfo.imageLinks?.large || volumeInfo.imageLinks?.thumbnail || '',
      previewLink: volumeInfo.previewLink || '',
      infoLink: volumeInfo.infoLink || '',
      buyLink: saleInfo.buyLink || '',
      price: saleInfo.listPrice?.amount || null,
      currency: saleInfo.listPrice?.currencyCode || 'USD',
      availability: saleInfo.saleability === 'FOR_SALE',
      content: isDetailed ? this.extractContent(volumeInfo) : '',
      rating: volumeInfo.averageRating || null,
      ratingCount: volumeInfo.ratingsCount || 0
    };
  }

  /**
   * Format Open Library API result
   * @param {Object} doc - Open Library document
   * @param {boolean} isDetailed - Whether this is a detailed result
   * @returns {Object} Formatted book result
   */
  formatOpenLibraryResult(doc, isDetailed = false) {
    return {
      id: doc.key || doc.cover_edition_key || `ol_${Date.now()}`,
      source: 'openlibrary',
      title: doc.title || 'Unknown Title',
      authors: doc.author_name || ['Unknown Author'],
      author: doc.author_name?.[0] || 'Unknown Author',
      description: doc.description || '',
      isbn: doc.isbn?.[0] || '',
      publishedDate: doc.first_publish_year?.toString() || '',
      publisher: doc.publisher?.[0] || '',
      pageCount: doc.number_of_pages_median || 0,
      categories: doc.subject || [],
      genre: doc.subject?.[0] || 'General',
      language: 'en',
      thumbnail: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : '',
      coverImage: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg` : '',
      previewLink: `https://openlibrary.org${doc.key}`,
      infoLink: `https://openlibrary.org${doc.key}`,
      buyLink: '',
      price: null,
      currency: 'USD',
      availability: false,
      content: isDetailed ? this.extractOpenLibraryContent(doc) : '',
      rating: null,
      ratingCount: 0
    };
  }

  /**
   * Extract ISBN from industry identifiers
   * @param {Array} identifiers - Industry identifiers array
   * @returns {string} ISBN
   */
  extractISBN(identifiers) {
    if (!identifiers) return '';
    
    const isbn = identifiers.find(id => 
      id.type === 'ISBN_13' || id.type === 'ISBN_10'
    );
    
    return isbn?.identifier || '';
  }

  /**
   * Extract content from Google Books volume info
   * @param {Object} volumeInfo - Volume information
   * @returns {string} Extracted content
   */
  extractContent(volumeInfo) {
    // Try to get sample text or description
    return volumeInfo.description || '';
  }

  /**
   * Extract content from Open Library document
   * @param {Object} doc - Open Library document
   * @returns {string} Extracted content
   */
  extractOpenLibraryContent(doc) {
    return doc.description || '';
  }

  /**
   * Deduplicate search results
   * @param {Array} results - Search results
   * @returns {Array} Deduplicated results
   */
  deduplicateResults(results) {
    const seen = new Set();
    return results.filter(book => {
      const key = book.isbn || `${book.title}_${book.author}`.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * Sort results by relevance to query
   * @param {Array} results - Search results
   * @param {string} query - Original search query
   * @returns {Array} Sorted results
   */
  sortByRelevance(results, query) {
    const queryLower = query.toLowerCase();
    
    return results.sort((a, b) => {
      // Exact title matches first
      const aTitleMatch = a.title.toLowerCase().includes(queryLower);
      const bTitleMatch = b.title.toLowerCase().includes(queryLower);
      
      if (aTitleMatch && !bTitleMatch) return -1;
      if (!aTitleMatch && bTitleMatch) return 1;
      
      // Then by rating (if available)
      if (a.rating && b.rating) {
        return b.rating - a.rating;
      }
      
      // Then by publication date (newer first)
      if (a.publishedDate && b.publishedDate) {
        return new Date(b.publishedDate) - new Date(a.publishedDate);
      }
      
      return 0;
    });
  }

  /**
   * Get search suggestions
   * @param {string} query - Partial query
   * @returns {Promise<Array>} Search suggestions
   */
  async getSearchSuggestions(query) {
    if (query.length < 2) return [];
    
    const cacheKey = `suggestions_${query}`;
    const cachedSuggestions = this.searchCache.get(cacheKey);
    if (cachedSuggestions) {
      return cachedSuggestions;
    }

    try {
      // Get quick results for suggestions
      const results = await this.searchBooks(query, { maxResults: 5 });
      const suggestions = results.map(book => ({
        title: book.title,
        author: book.author,
        id: book.id,
        source: book.source
      }));
      
      this.searchCache.set(cacheKey, suggestions);
      return suggestions;
    } catch (error) {
      console.error('Get suggestions error:', error);
      return [];
    }
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.flushAll();
    this.searchCache.flushAll();
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getCacheStats() {
    return {
      bookCache: {
        keys: this.cache.keys().length,
        hits: this.cache.getStats().hits,
        misses: this.cache.getStats().misses
      },
      searchCache: {
        keys: this.searchCache.keys().length,
        hits: this.searchCache.getStats().hits,
        misses: this.searchCache.getStats().misses
      }
    };
  }
}

module.exports = new BookSearchService();
