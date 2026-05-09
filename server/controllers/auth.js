const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const UserRepository = require('../models/User');

const userRepo = new UserRepository();

/**
 * Authentication controller
 */
class AuthController {
  /**
   * Generate JWT token
   * @param {Object} user - User object
   * @returns {string} JWT token
   */
  static generateToken(user) {
    return jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        username: user.username 
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
  }

  /**
   * Register new user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async register(req, res) {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { username, email, password } = req.body;

      // Create user
      const user = await userRepo.createUser({ username, email, password });

      // Generate token
      const token = AuthController.generateToken(user);

      res.status(201).json({
        message: 'User registered successfully',
        user,
        token
      });

    } catch (error) {
      console.error('Registration error:', error);
      
      if (error.message.includes('already exists')) {
        return res.status(409).json({
          error: 'User already exists',
          message: error.message
        });
      }

      res.status(500).json({
        error: 'Registration failed',
        message: 'Internal server error'
      });
    }
  }

  /**
   * Login user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async login(req, res) {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { identifier, password } = req.body;

      // Authenticate user
      const user = await userRepo.authenticate(identifier, password);

      if (!user) {
        return res.status(401).json({
          error: 'Authentication failed',
          message: 'Invalid credentials'
        });
      }

      // Generate token
      const token = AuthController.generateToken(user);

      res.json({
        message: 'Login successful',
        user,
        token
      });

    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        error: 'Login failed',
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get current user profile
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async getProfile(req, res) {
    try {
      const user = userRepo.getProfile(req.user.id);
      
      if (!user) {
        return res.status(404).json({
          error: 'User not found'
        });
      }

      // Get user statistics
      const stats = userRepo.getUserStats(req.user.id);

      res.json({
        user,
        stats
      });

    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        error: 'Failed to get profile',
        message: 'Internal server error'
      });
    }
  }

  /**
   * Update user profile
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async updateProfile(req, res) {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const updatedUser = userRepo.updateProfile(req.user.id, req.body);

      if (!updatedUser) {
        return res.status(404).json({
          error: 'User not found'
        });
      }

      res.json({
        message: 'Profile updated successfully',
        user: updatedUser
      });

    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({
        error: 'Failed to update profile',
        message: 'Internal server error'
      });
    }
  }

  /**
   * Change user password
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async changePassword(req, res) {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { currentPassword, newPassword } = req.body;

      // Verify current password
      const user = await userRepo.authenticate(req.user.email, currentPassword);
      if (!user) {
        return res.status(401).json({
          error: 'Invalid current password'
        });
      }

      // Update password
      const success = await userRepo.updatePassword(req.user.id, newPassword);

      if (!success) {
        return res.status(500).json({
          error: 'Failed to update password'
        });
      }

      res.json({
        message: 'Password updated successfully'
      });

    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({
        error: 'Failed to change password',
        message: 'Internal server error'
      });
    }
  }
}

module.exports = AuthController;