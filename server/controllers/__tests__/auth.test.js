const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const app = require('../../app');

// Mock the UserRepository
jest.mock('../../models/User', () => {
  return jest.fn().mockImplementation(() => ({
    createUser: jest.fn(),
    authenticate: jest.fn(),
    getProfile: jest.fn(),
    getUserStats: jest.fn(),
    updateProfile: jest.fn(),
    updatePassword: jest.fn()
  }));
});

const UserRepository = require('../../models/User');

describe('Auth Controller', () => {
  let userRepo;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Create a new instance for each test
    userRepo = new UserRepository();
    
    // Set up JWT secret for tests
    process.env.JWT_SECRET = 'test-secret';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = global.testUtils.createTestUser();

      const mockUser = {
        id: '1',
        username: userData.username,
        email: userData.email,
        created_at: new Date().toISOString()
      };

      UserRepository.mockImplementation(() => ({
        createUser: jest.fn().mockResolvedValue(mockUser),
        authenticate: jest.fn(),
        getProfile: jest.fn(),
        getUserStats: jest.fn(),
        updateProfile: jest.fn(),
        updatePassword: jest.fn()
      }));

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.message).toBe('User registered successfully');
      expect(response.body.user).toEqual(mockUser);
      expect(response.body.token).toBeDefined();
      
      // Verify JWT token structure
      const decodedToken = jwt.verify(response.body.token, process.env.JWT_SECRET);
      expect(decodedToken.id).toBe(mockUser.id);
      expect(decodedToken.email).toBe(mockUser.email);
    });

    it('should return 400 for invalid input', async () => {
      const invalidData = {
        username: 'ab', // too short
        email: 'invalid-email',
        password: '123' // too short
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details).toBeDefined();
      expect(Array.isArray(response.body.details)).toBe(true);
    });

    it('should return 400 for missing required fields', async () => {
      const incompleteData = {
        username: 'testuser'
        // missing email and password
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(incompleteData)
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
    });

    it('should return 409 for existing user', async () => {
      const userData = global.testUtils.createTestUser();

      UserRepository.mockImplementation(() => ({
        createUser: jest.fn().mockRejectedValue(new Error('User with this email or username already exists')),
        authenticate: jest.fn(),
        getProfile: jest.fn(),
        getUserStats: jest.fn(),
        updateProfile: jest.fn(),
        updatePassword: jest.fn()
      }));

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(409);

      expect(response.body.error).toBe('User already exists');
    });

    it('should handle database errors gracefully', async () => {
      const userData = global.testUtils.createTestUser();

      UserRepository.mockImplementation(() => ({
        createUser: jest.fn().mockRejectedValue(new Error('Database connection failed')),
        authenticate: jest.fn(),
        getProfile: jest.fn(),
        getUserStats: jest.fn(),
        updateProfile: jest.fn(),
        updatePassword: jest.fn()
      }));

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(500);

      expect(response.body.error).toBe('Registration failed');
      expect(response.body.message).toBe('Internal server error');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login user successfully', async () => {
      const loginData = {
        identifier: 'test@example.com',
        password: 'Password123'
      };

      const mockUser = {
        id: '1',
        username: 'testuser',
        email: 'test@example.com',
        created_at: new Date().toISOString()
      };

      userRepo.authenticate.mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.message).toBe('Login successful');
      expect(response.body.user).toEqual(mockUser);
      expect(response.body.token).toBeDefined();
      expect(userRepo.authenticate).toHaveBeenCalledWith(loginData.identifier, loginData.password);
    });

    it('should return 401 for invalid credentials', async () => {
      const loginData = {
        identifier: 'test@example.com',
        password: 'wrongpassword'
      };

      userRepo.authenticate.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.error).toBe('Authentication failed');
      expect(response.body.message).toBe('Invalid credentials');
    });

    it('should return 400 for missing fields', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({})
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
    });
  });

  describe('GET /api/auth/profile', () => {
    it('should get user profile successfully', async () => {
      const mockUser = {
        id: '1',
        username: 'testuser',
        email: 'test@example.com',
        created_at: new Date().toISOString()
      };

      const mockStats = {
        books: 5,
        videos: 3,
        completedVideos: 2,
        successRate: '66.7'
      };

      userRepo.getProfile.mockReturnValue(mockUser);
      userRepo.getUserStats.mockReturnValue(mockStats);

      const token = jwt.sign(mockUser, process.env.JWT_SECRET);

      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.user).toEqual(mockUser);
      expect(response.body.stats).toEqual(mockStats);
    });

    it('should return 401 without token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .expect(401);

      expect(response.body.error).toBe('Access denied');
      expect(response.body.message).toBe('No token provided');
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.error).toBe('Access denied');
      expect(response.body.message).toBe('Invalid token');
    });
  });

  describe('PUT /api/auth/profile', () => {
    it('should update user profile successfully', async () => {
      const mockUser = {
        id: '1',
        username: 'testuser',
        email: 'test@example.com',
        created_at: new Date().toISOString()
      };

      const updateData = {
        username: 'newusername'
      };

      const updatedUser = {
        ...mockUser,
        username: 'newusername'
      };

      userRepo.getProfile.mockReturnValue(mockUser);
      userRepo.updateProfile.mockReturnValue(updatedUser);

      const token = jwt.sign(mockUser, process.env.JWT_SECRET);

      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .send(updateData)
        .expect(200);

      expect(response.body.message).toBe('Profile updated successfully');
      expect(response.body.user).toEqual(updatedUser);
      expect(userRepo.updateProfile).toHaveBeenCalledWith(mockUser.id, updateData);
    });
  });

  describe('PUT /api/auth/password', () => {
    it('should change password successfully', async () => {
      const mockUser = {
        id: '1',
        username: 'testuser',
        email: 'test@example.com',
        created_at: new Date().toISOString()
      };

      const passwordData = {
        currentPassword: 'oldPassword123',
        newPassword: 'newPassword123'
      };

      userRepo.getProfile.mockReturnValue(mockUser);
      userRepo.authenticate.mockResolvedValue(mockUser);
      userRepo.updatePassword.mockResolvedValue(true);

      const token = jwt.sign(mockUser, process.env.JWT_SECRET);

      const response = await request(app)
        .put('/api/auth/password')
        .set('Authorization', `Bearer ${token}`)
        .send(passwordData)
        .expect(200);

      expect(response.body.message).toBe('Password updated successfully');
      expect(userRepo.authenticate).toHaveBeenCalledWith(mockUser.email, passwordData.currentPassword);
      expect(userRepo.updatePassword).toHaveBeenCalledWith(mockUser.id, passwordData.newPassword);
    });

    it('should return 401 for wrong current password', async () => {
      const mockUser = {
        id: '1',
        username: 'testuser',
        email: 'test@example.com',
        created_at: new Date().toISOString()
      };

      const passwordData = {
        currentPassword: 'wrongPassword',
        newPassword: 'newPassword123'
      };

      userRepo.getProfile.mockReturnValue(mockUser);
      userRepo.authenticate.mockResolvedValue(null);

      const token = jwt.sign(mockUser, process.env.JWT_SECRET);

      const response = await request(app)
        .put('/api/auth/password')
        .set('Authorization', `Bearer ${token}`)
        .send(passwordData)
        .expect(401);

      expect(response.body.error).toBe('Invalid current password');
    });
  });
});