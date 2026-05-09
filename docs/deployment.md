# BookVid AI Deployment Guide

This guide covers deployment options for the **personal version** of BookVid AI. This version has been simplified from the original commercial SaaS platform for individual use, portfolio demonstration, and learning purposes.

## 🔄 Architecture Changes

### What's Different from the Commercial Version?

**Removed Components:**
- ❌ Stripe payment processing
- ❌ PostgreSQL database (replaced with SQLite)
- ❌ Redis caching (replaced with in-memory)
- ❌ AWS S3 storage (replaced with local files)
- ❌ Complex user management
- ❌ Subscription and billing systems
- ❌ Usage limits and quota tracking

**Simplified Architecture:**
- ✅ **Single Container**: Frontend and backend in one Docker container
- ✅ **SQLite Database**: File-based, no separate database server needed
- ✅ **Local File Storage**: All uploads stored locally
- ✅ **Personal API Keys**: Direct integration with OpenAI, ElevenLabs
- ✅ **In-Memory Caching**: Simple caching without Redis dependency

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Local Development](#local-development)
3. [Docker Deployment](#docker-deployment)
4. [Platform-Specific Deployments](#platform-specific-deployments)
5. [Environment Configuration](#environment-configuration)
6. [Troubleshooting](#troubleshooting)

## Prerequisites

### Required API Keys

Before deploying, you'll need to obtain API keys for the AI services:

- **OpenAI API Key**: For script generation
  - Sign up at [OpenAI Platform](https://platform.openai.com/)
  - Create an API key in your dashboard
  - Ensure you have credits/billing set up

- **ElevenLabs API Key**: For voice synthesis
  - Sign up at [ElevenLabs](https://elevenlabs.io/)
  - Get your API key from the profile section
  - Free tier available with limited usage

- **Stability AI API Key** (Optional): For image generation
  - Sign up at [Stability AI](https://platform.stability.ai/)
  - Generate an API key in your account

### System Requirements

- Node.js 18+ (for local development)
- Docker and Docker Compose (for containerized deployment)
- SQLite (included in Docker images)
- FFmpeg (included in Docker images)

## Local Development

### Quick Start

1. **Clone and Install Dependencies**
   ```bash
   git clone <your-repo-url>
   cd bookvid-ai
   npm run install:all
   ```

2. **Configure Environment**
   ```bash
   cp env.example .env
   # Edit .env with your API keys and configuration
   ```

3. **Initialize Database**
   ```bash
   cd server
   npm run migrate
   ```

4. **Start Development Servers**
   ```bash
   npm run dev
   ```

   This starts:
   - Client dev server on http://localhost:5173
   - API server on http://localhost:3000

### Development Environment Variables

Copy `env.example` to `.env` and configure:

```bash
# Required API Keys
OPENAI_API_KEY=your_openai_api_key
ELEVENLABS_API_KEY=your_elevenlabs_key

# Development Configuration
NODE_ENV=development
PORT=3000
CLIENT_URL=http://localhost:5173
API_URL=http://localhost:3000
JWT_SECRET=your_dev_jwt_secret

# Database
DATABASE_PATH=./data/bookvid.db
```

## Docker Deployment

### Production Deployment with Docker

1. **Build and Run with Docker Compose**
   ```bash
   # Copy environment template
   cp .env.docker .env
   # Edit .env with your API keys
   
   # Build and start
   docker-compose up --build -d
   ```

2. **Access the Application**
   - Open http://localhost:3000
   - The React app and API are served from the same port

### Development with Docker

For development with hot reloading:

```bash
# Start development environment
npm run docker:dev

# Or manually
docker-compose -f docker-compose.dev.yml up --build
```

### Docker Commands

```bash
# Build production image
npm run docker:build

# Run production container
npm run docker:run

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Remove volumes (reset data)
docker-compose down -v
```

## Platform-Specific Deployments

### Railway

Railway offers simple deployment with automatic builds:

1. **Connect Repository**
   - Sign up at [Railway](https://railway.app/)
   - Connect your GitHub repository
   - Railway will auto-detect the Node.js project

2. **Configure Environment Variables**
   ```bash
   # In Railway dashboard, add these variables:
   NODE_ENV=production
   PORT=3000
   OPENAI_API_KEY=your_key
   ELEVENLABS_API_KEY=your_key
   JWT_SECRET=your_secure_secret
   DATABASE_PATH=/app/data/bookvid.db
   UPLOAD_PATH=/app/uploads
   ```

3. **Deploy**
   - Railway automatically builds and deploys on git push
   - Uses the Dockerfile for containerized deployment

### Heroku

Deploy to Heroku using Docker:

1. **Install Heroku CLI**
   ```bash
   # Install Heroku CLI
   # Login to Heroku
   heroku login
   ```

2. **Create Heroku App**
   ```bash
   heroku create your-bookvid-app
   heroku stack:set container -a your-bookvid-app
   ```

3. **Configure Environment Variables**
   ```bash
   heroku config:set NODE_ENV=production -a your-bookvid-app
   heroku config:set OPENAI_API_KEY=your_key -a your-bookvid-app
   heroku config:set ELEVENLABS_API_KEY=your_key -a your-bookvid-app
   heroku config:set JWT_SECRET=your_secure_secret -a your-bookvid-app
   ```

4. **Deploy**
   ```bash
   git push heroku main
   ```

### DigitalOcean App Platform

1. **Create App**
   - Go to [DigitalOcean App Platform](https://cloud.digitalocean.com/apps)
   - Connect your GitHub repository
   - Choose "Docker" as the resource type

2. **Configure Build**
   - Dockerfile path: `Dockerfile`
   - HTTP port: `3000`

3. **Set Environment Variables**
   - Add all required environment variables in the dashboard
   - Ensure `NODE_ENV=production`

### Render

1. **Create Web Service**
   - Sign up at [Render](https://render.com/)
   - Connect your GitHub repository
   - Choose "Docker" as the environment

2. **Configure Service**
   - Build command: `docker build -t bookvid-ai .`
   - Start command: `docker run -p 10000:3000 bookvid-ai`

3. **Environment Variables**
   - Add all required variables in Render dashboard
   - Set `PORT=3000`

## Environment Configuration

### Production Environment Variables

```bash
# Application
NODE_ENV=production
PORT=3000

# Database (SQLite)
DATABASE_PATH=/app/data/bookvid.db

# Authentication
JWT_SECRET=your_very_secure_jwt_secret_key
JWT_EXPIRES_IN=7d

# AI Services (REQUIRED)
OPENAI_API_KEY=sk-...
ELEVENLABS_API_KEY=...
STABILITY_API_KEY=sk-...

# File Storage
UPLOAD_PATH=/app/uploads
MAX_FILE_SIZE=50000000

# Cache Configuration
CACHE_MAX_SIZE=1000
CACHE_DEFAULT_TTL=3600

# URLs (adjust for your domain)
CLIENT_URL=https://your-domain.com
API_URL=https://your-domain.com
```

### Security Considerations

1. **JWT Secret**: Use a strong, random secret (32+ characters)
2. **API Keys**: Never commit API keys to version control
3. **HTTPS**: Use HTTPS in production (most platforms provide this automatically)
4. **CORS**: Configure CORS for your specific domain
5. **File Uploads**: Validate file types and sizes

## Troubleshooting

### Personal Project Deployment Issues

#### 🗄️ SQLite Database Issues

**Database Connection Problems:**
```bash
# Check if database file exists and is writable
ls -la data/bookvid.db
stat data/bookvid.db

# Fix permissions
chmod 644 data/bookvid.db
chmod 755 data/

# Test database connection
sqlite3 data/bookvid.db ".tables"
sqlite3 data/bookvid.db "PRAGMA integrity_check;"

# Recreate corrupted database
rm data/bookvid.db
cd server && npm run migrate
```

**Database Lock Issues (SQLite-specific):**
```bash
# Check for database locks
lsof data/bookvid.db

# Kill processes using the database
kill -9 <PID>

# Enable WAL mode for better concurrency
sqlite3 data/bookvid.db "PRAGMA journal_mode=WAL;"
```

#### 🔑 Personal API Key Issues

**OpenAI API Problems:**
```bash
# Test API key validity
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
  https://api.openai.com/v1/models

# Check billing and usage
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
  https://api.openai.com/v1/usage

# Common OpenAI issues:
# 1. No billing method set up
# 2. Usage limits exceeded  
# 3. API key revoked or expired
# 4. Insufficient credits
```

**ElevenLabs API Problems:**
```bash
# Test ElevenLabs API key
curl -H "xi-api-key: $ELEVENLABS_API_KEY" \
  https://api.elevenlabs.io/v1/user

# Check character quota
curl -H "xi-api-key: $ELEVENLABS_API_KEY" \
  https://api.elevenlabs.io/v1/user/subscription

# Common ElevenLabs issues:
# 1. Character limit exceeded
# 2. Invalid voice ID
# 3. API key not activated
```

#### 📁 Local File Storage Issues

**File Upload Problems:**
```bash
# Check disk space
df -h

# Verify upload directories exist
mkdir -p uploads/{covers,videos,thumbnails,audio,temp}
mkdir -p server/uploads/library/{backgrounds,music,videos}

# Fix permissions
chmod -R 755 uploads/
chown -R $USER:$USER uploads/

# Check file size limits
ls -lh uploads/videos/  # Look for large files
```

**Video Processing Issues:**
```bash
# Check FFmpeg availability
ffmpeg -version

# In Docker container
docker-compose exec bookvid-ai ffmpeg -version

# Test video processing
ffmpeg -f lavfi -i testsrc=duration=1:size=320x240:rate=1 test.mp4
```

#### 🐳 Docker Deployment Issues

**Container Build Problems:**
```bash
# Clear Docker cache
docker system prune -a

# Rebuild without cache
docker-compose build --no-cache

# Check build logs
docker-compose build 2>&1 | tee build.log
```

**Runtime Issues:**
```bash
# Check container status
docker-compose ps

# View detailed logs
docker-compose logs -f --tail=100 bookvid-ai

# Execute commands in container
docker-compose exec bookvid-ai bash
docker-compose exec bookvid-ai ls -la /app/data
```

**Volume Mount Problems:**
```bash
# Check volume mounts
docker-compose exec bookvid-ai df -h
docker-compose exec bookvid-ai ls -la /app/data /app/uploads

# Fix volume permissions
docker-compose exec bookvid-ai chown -R node:node /app/data /app/uploads
```

#### 🌐 Platform-Specific Deployment Issues

**Railway Deployment:**
- **Build Timeout**: Increase build resources in Railway dashboard
- **Memory Limits**: Optimize Docker image size
- **Volume Persistence**: Railway doesn't persist volumes between deployments
- **Environment Variables**: Ensure all API keys are set in Railway dashboard

**Heroku Deployment:**
- **Ephemeral Filesystem**: Files don't persist between dyno restarts
- **Memory Limits**: 512MB on free tier, optimize memory usage
- **Build Size**: 500MB slug size limit, optimize Docker image
- **Port Configuration**: Must use `$PORT` environment variable

**Render Deployment:**
- **Build Timeout**: Optimize Dockerfile for faster builds
- **Port Configuration**: Must use `PORT` environment variable
- **Health Checks**: Ensure `/health` endpoint responds correctly

#### 🚀 Performance Issues

**Slow Video Generation:**
```bash
# Monitor system resources
top -p $(pgrep node)
htop

# Check API response times
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3000/api/health

# Performance optimization tips:
# 1. Reduce book content size
# 2. Use faster AI models (gpt-3.5-turbo vs gpt-4)
# 3. Implement request queuing for multiple videos
# 4. Monitor API rate limits
```

**Memory Issues:**
```bash
# Monitor memory usage
ps aux | grep node
free -h

# Clear in-memory cache
curl -X POST http://localhost:3000/api/admin/clear-cache

# Restart application
docker-compose restart
```

#### 🔧 Configuration Issues

**Environment Variables:**
```bash
# Check if all required variables are set
env | grep -E "(OPENAI|ELEVENLABS|JWT|DATABASE)"

# Validate configuration
node -e "
const config = require('./server/config/database.js');
console.log('Database config:', config);
"
```

**CORS Issues:**
```bash
# Test CORS headers
curl -H "Origin: http://localhost:5173" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: X-Requested-With" \
  -X OPTIONS \
  http://localhost:3000/api/books
```

### Performance Optimization

1. **Database**: SQLite is suitable for personal use but consider PostgreSQL for heavy usage
2. **File Storage**: For production, consider cloud storage (AWS S3, Cloudinary)
3. **Caching**: The in-memory cache resets on restart; consider Redis for persistence
4. **CDN**: Use a CDN for static assets in production

### Monitoring

#### Health Checks

The application provides health check endpoints:

- `/health` - Basic health check
- `/api/health` - Detailed API health with database and cache stats

#### Logs

Monitor application logs for issues:

```bash
# Docker logs
docker-compose logs -f

# Local development
npm run dev  # Logs appear in terminal
```

### Backup and Recovery

#### Database Backup
```bash
# Backup SQLite database
cp data/bookvid.db data/bookvid.db.backup

# Or use SQLite dump
sqlite3 data/bookvid.db .dump > backup.sql
```

#### File Backup
```bash
# Backup uploads directory
tar -czf uploads-backup.tar.gz uploads/
```

## Support

For issues and questions:

1. Check the [troubleshooting section](#troubleshooting)
2. Review application logs
3. Verify environment configuration
4. Check API key validity and quotas

## Next Steps

After successful deployment:

1. Test all features (book upload, video generation)
2. Configure monitoring and alerts
3. Set up regular backups
4. Consider scaling options if needed
5. Update documentation with your specific deployment details