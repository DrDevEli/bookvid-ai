import React, { useState, useEffect } from 'react';
import videoService from '../../services/videoService';
import BookSearchModal from './BookSearchModal';

const BookManager = ({ onBookSelect, selectedBook }) => {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [newBook, setNewBook] = useState({
    title: '',
    author: '',
    genre: '',
    description: '',
    content: ''
  });

  useEffect(() => {
    loadBooks();
  }, []);

  const loadBooks = async () => {
    try {
      setLoading(true);
      const response = await videoService.getBooks();
      setBooks(response.books || []);
      setError(null);
    } catch (err) {
      setError('Failed to load books');
      console.error('Load books error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBook = async (e) => {
    e.preventDefault();
    try {
      const response = await videoService.createBook(newBook);
      setBooks([response.book, ...books]);
      setNewBook({ title: '', author: '', genre: '', description: '', content: '' });
      setShowCreateForm(false);
    } catch (err) {
      setError('Failed to create book');
      console.error('Create book error:', err);
    }
  };

  const handleSearchBookSelect = (bookData) => {
    // Pre-populate the form with searched book data
    setNewBook(bookData);
    setShowSearchModal(false);
    setShowCreateForm(true);
  };

  const handleBookSelect = (book) => {
    onBookSelect(book);
  };

  const handleDeleteBook = async (bookId, bookTitle) => {
    try {
      await videoService.deleteBook(bookId);
      setBooks(books.filter(book => book.id !== bookId));
      
      // If the deleted book was selected, clear the selection
      if (selectedBook?.id === bookId) {
        onBookSelect(null);
      }
    } catch (err) {
      setError('Failed to delete book');
      console.error('Delete book error:', err);
    }
  };

  if (loading) {
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

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">Your Books</h3>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowSearchModal(true)}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              Search Books
            </button>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {showCreateForm ? 'Cancel' : 'Add Book'}
            </button>
          </div>
        </div>
      </div>

      {showCreateForm && (
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <form onSubmit={handleCreateBook} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Title</label>
                <input
                  type="text"
                  value={newBook.title}
                  onChange={(e) => setNewBook({ ...newBook, title: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Author</label>
                <input
                  type="text"
                  value={newBook.author}
                  onChange={(e) => setNewBook({ ...newBook, author: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Genre</label>
              <input
                type="text"
                value={newBook.genre}
                onChange={(e) => setNewBook({ ...newBook, genre: e.target.value })}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="e.g., Fiction, Non-fiction, Romance"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                value={newBook.description}
                onChange={(e) => setNewBook({ ...newBook, description: e.target.value })}
                rows={3}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Brief description of the book..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Content</label>
              <textarea
                value={newBook.content}
                onChange={(e) => setNewBook({ ...newBook, content: e.target.value })}
                rows={6}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Paste your book content here (excerpt, summary, or key points)..."
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                Create Book
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="p-6">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {books.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No books yet</h3>
            <p className="text-gray-500 mb-4">Create your first book to start generating videos</p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
            >
              Add Your First Book
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 break-words">
            {books.map((book) => (
              <div
                key={book.id}
                onClick={() => handleBookSelect(book)}
                className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 ${
                  selectedBook?.id === book.id
                    ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200'
                    : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 break-words">{book.title}</h4>
                    <p className="text-sm text-gray-600 break-words">by {book.author}</p>
                    {book.genre && (
                      <span className="inline-block mt-1 px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded break-words">
                        {book.genre}
                      </span>
                    )}
                  </div>
                  <div className="ml-2 flex items-center space-x-2">
                    {selectedBook?.id === book.id && (
                      <svg className="h-5 w-5 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteBook(book.id, book.title);
                      }}
                      className="text-red-600 hover:text-red-800 p-1 rounded-md hover:bg-red-50 transition-colors"
                      title="Delete book"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
                {book.description && (
                  <p className="mt-2 text-sm text-gray-500 line-clamp-2 break-words">{book.description}</p>
                )}
                <div className="mt-3 text-xs text-gray-400">
                  Created {new Date(book.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Book Search Modal */}
      <BookSearchModal
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        onBookSelect={handleSearchBookSelect}
      />
    </div>
  );
};

export default BookManager;
