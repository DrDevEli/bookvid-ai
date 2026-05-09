const express = require('express');
const { body, query } = require('express-validator');
const { validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const BookRepository = require('../models/Book');

const router = express.Router();
const bookRepo = new BookRepository();

/**
 * Validation rules for book creation
 */
const createBookValidation = [
  body('title')
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ max: 255 })
    .withMessage('Title must be less than 255 characters'),
  
  body('author')
    .notEmpty()
    .withMessage('Author is required')
    .isLength({ max: 255 })
    .withMessage('Author must be less than 255 characters'),
  
  body('genre')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Genre must be less than 100 characters'),
  
  body('description')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters'),
  
  body('content')
    .optional()
    .isLength({ max: 50000 })
    .withMessage('Content must be less than 50000 characters')
];

/**
 * Get all books for authenticated user
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    
    let books;
    if (search) {
      books = bookRepo.searchBooks(req.user.id, search, {
        page: parseInt(page),
        limit: parseInt(limit)
      });
    } else {
      books = bookRepo.getUserBooks(req.user.id, {
        page: parseInt(page),
        limit: parseInt(limit)
      });
    }

    res.json({
      books,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Get books error:', error);
    res.status(500).json({
      error: 'Failed to get books',
      message: 'Internal server error'
    });
  }
});

/**
 * Get single book by ID
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const book = bookRepo.findById(req.params.id);
    
    if (!book) {
      return res.status(404).json({
        error: 'Book not found'
      });
    }

    // Check if book belongs to user
    if (book.user_id !== req.user.id) {
      return res.status(403).json({
        error: 'Access denied'
      });
    }

    res.json({ book });

  } catch (error) {
    console.error('Get book error:', error);
    res.status(500).json({
      error: 'Failed to get book',
      message: 'Internal server error'
    });
  }
});

/**
 * Create new book
 */
router.post('/', authenticateToken, createBookValidation, async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const bookData = {
      ...req.body,
      user_id: req.user.id
    };

    const book = bookRepo.createBook(bookData);

    res.status(201).json({
      message: 'Book created successfully',
      book
    });

  } catch (error) {
    console.error('Create book error:', error);
    res.status(500).json({
      error: 'Failed to create book',
      message: 'Internal server error'
    });
  }
});

/**
 * Update book
 */
router.put('/:id', authenticateToken, createBookValidation, async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const book = bookRepo.findById(req.params.id);
    
    if (!book) {
      return res.status(404).json({
        error: 'Book not found'
      });
    }

    // Check if book belongs to user
    if (book.user_id !== req.user.id) {
      return res.status(403).json({
        error: 'Access denied'
      });
    }

    const updatedBook = bookRepo.updateBook(req.params.id, req.body);

    res.json({
      message: 'Book updated successfully',
      book: updatedBook
    });

  } catch (error) {
    console.error('Update book error:', error);
    res.status(500).json({
      error: 'Failed to update book',
      message: 'Internal server error'
    });
  }
});

/**
 * Delete book
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const book = bookRepo.findById(req.params.id);
    
    if (!book) {
      return res.status(404).json({
        error: 'Book not found'
      });
    }

    // Check if book belongs to user
    if (book.user_id !== req.user.id) {
      return res.status(403).json({
        error: 'Access denied'
      });
    }

    const success = bookRepo.delete(req.params.id);

    if (!success) {
      return res.status(500).json({
        error: 'Failed to delete book'
      });
    }

    res.json({
      message: 'Book deleted successfully'
    });

  } catch (error) {
    console.error('Delete book error:', error);
    res.status(500).json({
      error: 'Failed to delete book',
      message: 'Internal server error'
    });
  }
});

module.exports = router;