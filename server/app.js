const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const databaseManager = require('./config/database');
const DatabaseUtils = require('./utils/database');
const CacheUtils = require('./utils/cacheUtils');
const sessionService = require('./services/sessionService');
const fileStorage = require('./utils/fileStorage');
const FileUploadMiddleware = require('./middleware/fileUpload');
const { addServiceInfo } = require('./utils/apiKeyValidation');

const app = express();

// Initialize database
try {
  databaseManager.initialize();
  console.log('✅ Database initialized successfully');
} catch (error) {
  console.error('❌ Failed to initialize database:', error);
  process.exit(1);
}

// Initialize file storage directories
(async () => {
  try {
    await fileStorage.initializeDirectories();
    console.log('✅ File storage directories initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize file storage directories:', error);
  }
})();

// CORS Configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? [process.env.CLIENT_URL || 'https://yourdomain.com'] 
    : ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  maxAge: 86400 // 24 hours
};

// Middleware
app.use(helmet());
app.use(cors(corsOptions));
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Add service availability info to all requests
app.use(addServiceInfo);

// Routes
const authRoutes = require('./routes/auth');
const bookRoutes = require('./routes/books');
const videoRoutes = require('./routes/videos');
const configRoutes = require('./routes/config');
const scriptRoutes = require('./routes/scripts');
const voiceoverRoutes = require('./routes/voiceovers');
const fileRoutes = require('./routes/files');
const videoGenerationRoutes = require('./routes/videoGeneration');
const bookSearchRoutes = require('./routes/bookSearch');

app.get('/', (req, res) => {
  res.json({ message: 'BookVid AI API Server' });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/config', configRoutes);
app.use('/api/scripts', scriptRoutes);
app.use('/api/voiceovers', voiceoverRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/video-generation', videoGenerationRoutes);
app.use('/api/book-search', bookSearchRoutes);

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// In production, serve the React app
if (process.env.NODE_ENV === 'production') {
  // Serve static files from the React app build directory
  app.use(express.static(path.join(__dirname, '../client/dist')));
  
  // Handle React routing, return all requests to React app
  app.get('*', (req, res, next) => {
    // Skip API routes
    if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/') || req.path === '/health') {
      return next();
    }
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
}

// Health check endpoints
app.get('/health', async (req, res) => {
  try {
    const dbHealthy = await DatabaseUtils.healthCheck();
    const dbStats = await DatabaseUtils.getStats();
    const cacheStats = (() => {
      try {
        return CacheUtils.getExtendedStats();
      } catch (error) {
        console.error('Cache stats error:', error);
        return { error: error.message };
      }
    })();
    const sessionStats = sessionService.getStats();
    
    res.status(200).json({ 
      status: 'OK', 
      database: dbHealthy ? 'connected' : 'disconnected',
      cache: 'active',
      sessions: 'active',
      stats: {
        database: dbStats,
        cache: cacheStats,
        sessions: sessionStats
      },
      timestamp: new Date().toISOString() 
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'ERROR', 
      database: 'error',
      cache: 'error',
      sessions: 'error',
      error: error.message,
      timestamp: new Date().toISOString() 
    });
  }
});

// API health check
app.get('/api/health', async (req, res) => {
  try {
    const dbHealthy = await DatabaseUtils.healthCheck();
    const dbStats = await DatabaseUtils.getStats();
    const cacheStats = (() => {
      try {
        return CacheUtils.getExtendedStats();
      } catch (error) {
        console.error('Cache stats error:', error);
        return { error: error.message };
      }
    })();
    const sessionStats = sessionService.getStats();
    
    res.status(200).json({ 
      status: 'OK', 
      database: dbHealthy ? 'connected' : 'disconnected',
      cache: 'active',
      sessions: 'active',
      stats: {
        database: dbStats,
        cache: cacheStats,
        sessions: sessionStats
      },
      timestamp: new Date().toISOString() 
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'ERROR', 
      database: 'error',
      cache: 'error',
      sessions: 'error',
      error: error.message,
      timestamp: new Date().toISOString() 
    });
  }
});

// File upload error handling
app.use(FileUploadMiddleware.errorHandler());

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

module.exports = app; 