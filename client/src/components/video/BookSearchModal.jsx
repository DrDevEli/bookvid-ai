import React, { useState, useEffect, useCallback } from 'react';
import bookSearchService from '../../services/bookSearchService';

const BookSearchModal = ({ isOpen, onClose, onBookSelect }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [genres, setGenres] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchType, setSearchType] = useState('all');
  const [selectedGenre, setSelectedGenre] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);

  // Debounced search function
  const debouncedSearch = useCallback(
    (() => {
      let timeoutId;
      return (query, type) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(async () => {
          if (query.length >= 2) {
            await performSearch(query, type);
          }
        }, 300);
      };
    })(),
    []
  );

  // Load genres on component mount
  useEffect(() => {
    if (isOpen) {
      loadGenres();
    }
  }, [isOpen]);

  // Handle search query changes
  useEffect(() => {
    if (searchQuery.length >= 2) {
      debouncedSearch(searchQuery, searchType);
      loadSuggestions(searchQuery);
    } else {
      setSearchResults([]);
      setSuggestions([]);
    }
  }, [searchQuery, searchType, debouncedSearch]);

  const loadGenres = async () => {
    try {
      const response = await bookSearchService.getGenres();
      setGenres(response.genres || []);
    } catch (err) {
      console.error('Load genres error:', err);
    }
  };

  const loadSuggestions = async (query) => {
    try {
      const response = await bookSearchService.getSuggestions(query);
      setSuggestions(response.suggestions || []);
    } catch (err) {
      console.error('Load suggestions error:', err);
    }
  };

  const performSearch = async (query, type) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await bookSearchService.searchBooks(query, {
        maxResults: 20,
        searchType: type
      });
      
      setSearchResults(response.results || []);
    } catch (err) {
      setError('Search failed. Please try again.');
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenreSearch = async (genre) => {
    try {
      setLoading(true);
      setError(null);
      setSelectedGenre(genre);
      
      const response = await bookSearchService.searchByGenre(genre, {
        maxResults: 20
      });
      
      setSearchResults(response.results || []);
    } catch (err) {
      setError('Genre search failed. Please try again.');
      console.error('Genre search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBookSelect = async (book) => {
    try {
      setLoading(true);
      
      // Get detailed book information
      const response = await bookSearchService.getBookDetails(book.id, book.source);
      const detailedBook = response.book;
      
      // Format book data for the form
      const bookData = {
        title: detailedBook.title,
        author: detailedBook.author,
        genre: detailedBook.genre,
        description: detailedBook.description,
        content: detailedBook.content || '',
        cover_image_path: detailedBook.coverImage || detailedBook.thumbnail
      };
      
      onBookSelect(bookData);
      onClose();
    } catch (err) {
      setError('Failed to get book details. Please try again.');
      console.error('Get book details error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setSearchQuery(suggestion.title);
    setShowSuggestions(false);
  };

  const handleClose = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSuggestions([]);
    setSelectedGenre('');
    setError(null);
    setSelectedBook(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">Search Books</h3>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Search Controls */}
          <div className="mb-6">
            <div className="flex space-x-4 mb-4">
              {/* Search Input */}
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setShowSuggestions(true)}
                  placeholder="Search by title, author, or ISBN..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                />
                
                {/* Search Suggestions */}
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {suggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="w-full px-4 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                      >
                        <div className="font-medium text-gray-900">{suggestion.title}</div>
                        <div className="text-sm text-gray-600">by {suggestion.author}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Search Type Selector */}
              <select
                value={searchType}
                onChange={(e) => setSearchType(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="all">All</option>
                <option value="title">Title</option>
                <option value="author">Author</option>
                <option value="isbn">ISBN</option>
              </select>
            </div>

            {/* Genre Search */}
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Or browse by genre:</h4>
              <div className="flex flex-wrap gap-2">
                {genres.slice(0, 10).map((genre) => (
                  <button
                    key={genre}
                    onClick={() => handleGenreSearch(genre)}
                    className={`px-3 py-1 text-sm rounded-full border ${
                      selectedGenre === genre
                        ? 'bg-indigo-100 text-indigo-800 border-indigo-300'
                        : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                    }`}
                  >
                    {genre}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <span className="ml-2 text-gray-600">Searching...</span>
            </div>
          )}

          {/* Search Results */}
          {!loading && searchResults.length > 0 && (
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-gray-900">
                {searchQuery ? `Search results for "${searchQuery}"` : `Books in ${selectedGenre}`}
                <span className="ml-2 text-gray-500">({searchResults.length} results)</span>
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {searchResults.map((book, index) => (
                  <div
                    key={`${book.id}-${index}`}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => handleBookSelect(book)}
                  >
                    <div className="flex space-x-4">
                      {/* Book Cover */}
                      <div className="flex-shrink-0">
                        {book.thumbnail ? (
                          <img
                            src={book.thumbnail}
                            alt={book.title}
                            className="w-16 h-20 object-cover rounded"
                          />
                        ) : (
                          <div className="w-16 h-20 bg-gray-200 rounded flex items-center justify-center">
                            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                          </div>
                        )}
                      </div>

                      {/* Book Info */}
                      <div className="flex-1 min-w-0">
                        <h5 className="font-medium text-gray-900 truncate">{book.title}</h5>
                        <p className="text-sm text-gray-600">by {book.author}</p>
                        
                        {book.genre && (
                          <span className="inline-block mt-1 px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                            {book.genre}
                          </span>
                        )}
                        
                        {book.publishedDate && (
                          <p className="text-xs text-gray-500 mt-1">
                            Published: {book.publishedDate}
                          </p>
                        )}
                        
                        {book.description && (
                          <p className="text-xs text-gray-600 mt-2 line-clamp-2">
                            {book.description}
                          </p>
                        )}

                        <div className="flex items-center mt-2 space-x-2">
                          <span className="text-xs text-gray-500">
                            {book.source === 'google' ? 'Google Books' : 'Open Library'}
                          </span>
                          {book.rating && (
                            <div className="flex items-center text-xs text-gray-500">
                              <svg className="w-3 h-3 text-yellow-400 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                              {book.rating} ({book.ratingCount})
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No Results */}
          {!loading && searchResults.length === 0 && searchQuery && (
            <div className="text-center py-8">
              <div className="text-gray-400 mb-4">
                <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No books found</h3>
              <p className="text-gray-500">Try a different search term or browse by genre</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-end">
            <button
              onClick={handleClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookSearchModal;
