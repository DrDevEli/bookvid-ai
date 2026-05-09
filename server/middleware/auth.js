const jwt = require('jsonwebtoken');
const UserRepository = require('../models/User');

const userRepo = new UserRepository();

/**
 * Extract token from authorization header
 * @param {string} authHeader - Authorization header value
 * @returns {string|null} Token or null if not found
 * @private
 */
const extractToken = (authHeader) => {
  if (!authHeader) return null;
  
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }
  
  return parts[1];
};

/**
 * JWT Authentication middleware
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const authenticateToken = async (req, res, next) => {
  try {
    const token = extractToken(req.headers['authorization']);

    if (!token) {
      return res.status(401).json({
        error: 'Access denied',
        message: 'No valid token provided'
      });
    }

    // Verify token with additional checks
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Validate token payload structure
    if (!decoded.id || !decoded.email) {
      return res.status(401).json({
        error: 'Access denied',
        message: 'Invalid token payload'
      });
    }
    
    // Get user from database to ensure they still exist
    const user = userRepo.getProfile(decoded.id);
    
    if (!user) {
      return res.status(401).json({
        error: 'Access denied',
        message: 'User not found'
      });
    }

    // Add user to request object
    req.user = user;
    next();

  } catch (error) {
    console.error('Authentication error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Access denied',
        message: 'Invalid token format'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Access denied',
        message: 'Token expired'
      });
    }

    if (error.name === 'NotBeforeError') {
      return res.status(401).json({
        error: 'Access denied',
        message: 'Token not active yet'
      });
    }

    res.status(500).json({
      error: 'Authentication failed',
      message: 'Internal server error'
    });
  }
};

/**
 * Optional authentication middleware - doesn't fail if no token
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      req.user = null;
      return next();
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database
    const user = userRepo.getProfile(decoded.id);
    
    req.user = user || null;
    next();

  } catch (error) {
    // If token is invalid, just continue without user
    req.user = null;
    next();
  }
};

module.exports = {
  authenticateToken,
  optionalAuth
};