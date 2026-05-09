const { userRepository, bookRepository, videoRepository, templateRepository } = require('../models');

/**
 * Example controller showing how to use the repositories
 * This demonstrates the repository pattern implementation
 */
class ExampleController {
  
  /**
   * Example: Create a user and their first book
   */
  static async createUserWithBook(req, res) {
    try {
      const { username, email, password, bookTitle, bookAuthor, bookGenre } = req.body;
      
      // Create user
      const user = await userRepository.createUser({
        username,
        email,
        password
      });
      
      // Create their first book
      const book = bookRepository.createBook({
        user_id: user.id,
        title: bookTitle,
        author: bookAuthor,
        genre: bookGenre,
        description: `A ${bookGenre} book by ${bookAuthor}`
      });
      
      res.status(201).json({
        message: 'User and book created successfully',
        user,
        book
      });
      
    } catch (error) {
      res.status(400).json({
        error: error.message
      });
    }
  }
  
  /**
   * Example: Get user dashboard data
   */
  static async getUserDashboard(req, res) {
    try {
      const { userId } = req.params;
      
      // Get user profile
      const user = userRepository.getProfile(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Get user statistics
      const userStats = userRepository.getUserStats(userId);
      const videoStats = videoRepository.getUserVideoStats(userId);
      
      // Get recent books and videos
      const recentBooks = bookRepository.getRecentBooks(userId, 5);
      const recentVideos = videoRepository.getRecentCompletedVideos(userId, 5);
      const generatingVideos = videoRepository.getGeneratingVideos(userId);
      
      res.json({
        user,
        stats: {
          ...userStats,
          ...videoStats
        },
        recentBooks,
        recentVideos,
        generatingVideos
      });
      
    } catch (error) {
      res.status(500).json({
        error: error.message
      });
    }
  }
  
  /**
   * Example: Create a video from a book
   */
  static async createVideoFromBook(req, res) {
    try {
      const { userId, bookId } = req.params;
      const { title, script, templateId } = req.body;
      
      // Verify book belongs to user
      const book = bookRepository.getBookWithStats(bookId, userId);
      if (!book) {
        return res.status(404).json({ error: 'Book not found' });
      }
      
      // Verify template exists
      const template = templateRepository.getTemplateWithConfig(templateId);
      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }
      
      // Create video
      const video = videoRepository.createVideo({
        user_id: userId,
        book_id: bookId,
        title,
        script,
        template_id: templateId
      });
      
      res.status(201).json({
        message: 'Video creation started',
        video,
        book: {
          id: book.id,
          title: book.title,
          author: book.author
        },
        template: {
          id: template.id,
          name: template.name,
          config: template.config
        }
      });
      
    } catch (error) {
      res.status(400).json({
        error: error.message
      });
    }
  }
  
  /**
   * Example: Get templates suitable for a book's genre
   */
  static async getTemplatesForBook(req, res) {
    try {
      const { userId, bookId } = req.params;
      
      // Get book details
      const book = bookRepository.getBookWithStats(bookId, userId);
      if (!book) {
        return res.status(404).json({ error: 'Book not found' });
      }
      
      // Get templates suitable for this genre
      const templates = templateRepository.getTemplatesForGenre(book.genre || 'general');
      
      // Get popular templates as fallback
      const popularTemplates = templateRepository.getPopularTemplates(5);
      
      res.json({
        book: {
          id: book.id,
          title: book.title,
          genre: book.genre
        },
        recommendedTemplates: templates,
        popularTemplates
      });
      
    } catch (error) {
      res.status(500).json({
        error: error.message
      });
    }
  }
  
  /**
   * Example: Search across user's content
   */
  static async searchUserContent(req, res) {
    try {
      const { userId } = req.params;
      const { q: searchTerm, type } = req.query;
      
      if (!searchTerm) {
        return res.status(400).json({ error: 'Search term is required' });
      }
      
      const results = {};
      
      // Search books if requested or no type specified
      if (!type || type === 'books') {
        results.books = bookRepository.searchUserBooks(userId, searchTerm, { limit: 10 });
      }
      
      // Search videos if requested or no type specified
      if (!type || type === 'videos') {
        results.videos = videoRepository.searchUserVideos(userId, searchTerm, { limit: 10 });
      }
      
      // Search templates if requested
      if (!type || type === 'templates') {
        results.templates = templateRepository.searchTemplates(searchTerm, { limit: 10 });
      }
      
      res.json({
        searchTerm,
        results
      });
      
    } catch (error) {
      res.status(500).json({
        error: error.message
      });
    }
  }
}

module.exports = ExampleController;