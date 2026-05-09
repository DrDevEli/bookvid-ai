# BookVid AI Personal Project Setup Guide

This guide will help you set up BookVid AI as a personal project for individual use, portfolio demonstration, and learning purposes.

## Prerequisites

### System Requirements
- Node.js 18 or higher
- Docker & Docker Compose (recommended)
- Git

### Required API Keys
- **OpenAI API Key** (required) - [Get it here](https://platform.openai.com/)
- **ElevenLabs API Key** (required) - [Get it here](https://elevenlabs.io/)
- **Stability AI API Key** (optional) - [Get it here](https://platform.stability.ai/)

## Quick Setup (Recommended)

### Automated Setup Script

```bash
# Clone the repository
git clone <your-repo-url>
cd bookvid-ai

# Run the setup script
chmod +x scripts/setup.sh
./scripts/setup.sh
```

The script will:
- Install all dependencies
- Create environment configuration
- Set up database and directories
- Generate secure JWT secret
- Initialize the SQLite database

## Manual Setup

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd bookvid-ai
npm run install:all
```

### 2. Environment Configuration

```bash
cp env.example .env
```

Edit `.env` with your configuration:

```bash
# Required API Keys
OPENAI_API_KEY=your_openai_api_key_here
ELEVENLABS_API_KEY=your_elevenlabs_key_here

# Optional API Keys
STABILITY_API_KEY=your_stability_ai_key_here

# Application Configuration
NODE_ENV=development
PORT=3000
CLIENT_URL=http://localhost:5173
API_URL=http://localhost:3000

# Database (SQLite)
DATABASE_PATH=./data/bookvid.db

# Authentication
JWT_SECRET=your_secure_jwt_secret_here
JWT_EXPIRES_IN=7d

# File Storage
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=50000000
```

### 3. Initialize Database

```bash
cd server
npm run migrate
cd ..
```

### 4. Create Directories

```bash
mkdir -p data
mkdir -p uploads/{covers,videos,thumbnails,audio,temp}
mkdir -p server/uploads/library/{backgrounds,music,videos}
```

### 5. Start Development

```bash
npm run dev
```

Access the application:
- Frontend: http://localhost:5173
- API: http://localhost:3000
- Health Check: http://localhost:3000/health

## Docker Setup

### Development with Docker

```bash
# Copy Docker environment template
cp .env.docker .env
# Edit .env with your API keys

# Start development environment
docker-compose -f docker-compose.dev.yml up --build
```

### Production with Docker

```bash
# Copy Docker environment template
cp .env.docker .env
# Edit .env with your API keys

# Start production environment
docker-compose up --build -d
```

Access at: http://localhost:3000

## API Key Setup

### OpenAI API Key (Required)

**Cost**: ~$0.01-0.10 per video script generation

1. **Create Account**
   - Go to [OpenAI Platform](https://platform.openai.com/)
   - Sign up or log in to your account

2. **Add Billing Information**
   - Go to "Billing" in your dashboard
   - Add a payment method (required for API access)
   - Consider setting usage limits to control costs

3. **Generate API Key**
   - Navigate to "API Keys" section
   - Click "Create new secret key"
   - Copy the key (starts with `sk-`)
   - **Important**: Save it immediately - you can't view it again

4. **Add to Environment**
   ```bash
   # In your .env file
   OPENAI_API_KEY=sk-your-actual-key-here
   ```

5. **Test the Key**
   ```bash
   curl -H "Authorization: Bearer $OPENAI_API_KEY" \
     https://api.openai.com/v1/models
   ```

### ElevenLabs API Key (Required)

**Cost**: Free tier available, then ~$1-5 per month for personal use

1. **Create Account**
   - Go to [ElevenLabs](https://elevenlabs.io/)
   - Sign up with email or Google account

2. **Get API Key**
   - Click on your profile (top right)
   - Go to "Profile" settings
   - Copy your API key from the "API Key" section

3. **Add to Environment**
   ```bash
   # In your .env file
   ELEVENLABS_API_KEY=your-elevenlabs-key-here
   ```

4. **Test the Key**
   ```bash
   curl -H "xi-api-key: $ELEVENLABS_API_KEY" \
     https://api.elevenlabs.io/v1/voices
   ```

### Stability AI API Key (Optional)

**Cost**: Free credits available, then pay-per-use

1. **Create Account**
   - Go to [Stability AI Platform](https://platform.stability.ai/)
   - Sign up for an account

2. **Generate API Key**
   - Navigate to "API Keys" in your dashboard
   - Click "Create API Key"
   - Copy the key (starts with `sk-`)

3. **Add to Environment**
   ```bash
   # In your .env file (optional)
   STABILITY_API_KEY=sk-your-stability-key-here
   ```

### API Key Security Best Practices

1. **Never commit API keys to version control**
2. **Use environment variables only**
3. **Set usage limits on provider dashboards**
4. **Monitor usage regularly**
5. **Rotate keys periodically**

### Cost Management

- **OpenAI**: Set monthly usage limits in dashboard
- **ElevenLabs**: Monitor character usage in your account
- **Stability AI**: Track credit usage and set alerts

**Estimated Monthly Costs for Personal Use:**
- Light usage (5-10 videos): $2-5
- Moderate usage (20-50 videos): $10-25
- Heavy usage (100+ videos): $50-100

## Testing the Setup

### 1. Health Check

```bash
curl http://localhost:3000/health
```

Should return status "OK" with database and cache information.

### 2. API Test

```bash
curl http://localhost:3000/api/health
```

Should return detailed API health information.

### 3. Frontend Test

Open http://localhost:5173 in your browser. You should see the BookVid AI interface.

## Troubleshooting

### Common Setup Issues

#### 1. API Key Problems

**Issue**: "Invalid API key" or "Unauthorized" errors

**Solutions**:
```bash
# Check if API keys are loaded
echo "OpenAI: $OPENAI_API_KEY"
echo "ElevenLabs: $ELEVENLABS_API_KEY"

# Test OpenAI API key
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
  https://api.openai.com/v1/models

# Test ElevenLabs API key
curl -H "xi-api-key: $ELEVENLABS_API_KEY" \
  https://api.elevenlabs.io/v1/voices

# Common fixes:
# 1. Ensure no spaces around the = in .env file
# 2. No quotes around the API key value
# 3. Restart the application after changing .env
# 4. Check for billing setup on OpenAI dashboard
```

#### 2. Database Issues

**Issue**: Database connection errors or missing tables

**Solutions**:
```bash
# Check if database file exists
ls -la data/bookvid.db

# Check database permissions
chmod 644 data/bookvid.db
chmod 755 data/

# Reinitialize database
cd server
npm run migrate
cd ..

# If database is corrupted, recreate it
rm data/bookvid.db
cd server && npm run migrate
```

#### 3. Port Conflicts

**Issue**: "Port 3000 already in use" or "EADDRINUSE"

**Solutions**:
```bash
# Find what's using the port
lsof -i :3000
# or
netstat -tulpn | grep :3000

# Kill the process
kill -9 <PID>

# Or use a different port
# In .env file: PORT=3001
```

#### 4. File Permission Issues

**Issue**: Cannot upload files or create directories

**Solutions**:
```bash
# Fix upload directory permissions
chmod -R 755 uploads/
chmod -R 755 data/

# Ensure directories exist
mkdir -p uploads/{covers,videos,thumbnails,audio,temp}
mkdir -p server/uploads/library/{backgrounds,music,videos}

# Check disk space
df -h
```

#### 5. Node.js Version Issues

**Issue**: Compatibility errors or missing features

**Solutions**:
```bash
# Check Node.js version (need 18+)
node --version

# Update Node.js using nvm
nvm install 18
nvm use 18

# Or update npm
npm install -g npm@latest
```

### Docker-Specific Issues

#### 1. Container Build Failures

```bash
# Clear Docker cache and rebuild
docker system prune -a
docker-compose build --no-cache

# Check Docker logs
docker-compose logs -f bookvid-ai
```

#### 2. Volume Mount Issues

```bash
# Check if volumes are properly mounted
docker-compose exec bookvid-ai ls -la /app/data
docker-compose exec bookvid-ai ls -la /app/uploads

# Fix volume permissions
docker-compose exec bookvid-ai chown -R node:node /app/data /app/uploads
```

#### 3. Environment Variables in Docker

```bash
# Check if environment variables are loaded in container
docker-compose exec bookvid-ai env | grep OPENAI
docker-compose exec bookvid-ai env | grep ELEVENLABS

# Ensure .env file is in the same directory as docker-compose.yml
```

### Application-Specific Issues

#### 1. Video Generation Fails

**Symptoms**: Videos stuck in "generating" status

**Debug Steps**:
```bash
# Check server logs
npm run dev  # Look for error messages

# Test AI services individually
curl -X POST http://localhost:3000/api/ai/test-openai
curl -X POST http://localhost:3000/api/ai/test-elevenlabs

# Check file system space
df -h

# Verify FFmpeg is available (in Docker)
docker-compose exec bookvid-ai ffmpeg -version
```

#### 2. Frontend Not Loading

**Symptoms**: Blank page or connection refused

**Solutions**:
```bash
# Check if both servers are running
curl http://localhost:3000/health
curl http://localhost:5173

# Clear browser cache and cookies
# Check browser console for JavaScript errors

# Verify client build
cd client
npm run build
```

#### 3. Authentication Issues

**Symptoms**: Cannot login or register

**Solutions**:
```bash
# Check JWT secret is set
echo $JWT_SECRET

# Generate a new JWT secret if needed
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Check database for users table
sqlite3 data/bookvid.db ".tables"
sqlite3 data/bookvid.db "SELECT * FROM users;"
```

### Performance Issues

#### 1. Slow Video Generation

**Causes & Solutions**:
- **API Rate Limits**: Check OpenAI/ElevenLabs usage dashboards
- **Large Files**: Reduce book content size or split into chapters
- **System Resources**: Monitor CPU/RAM usage during generation
- **Network**: Ensure stable internet connection for API calls

#### 2. High Memory Usage

**Solutions**:
```bash
# Monitor memory usage
top -p $(pgrep node)

# Restart application to clear memory cache
npm run dev  # Stop and restart

# For Docker
docker-compose restart
```

### Getting Additional Help

#### 1. Enable Debug Logging

```bash
# In .env file
DEBUG=bookvid:*
LOG_LEVEL=debug

# Restart application
npm run dev
```

#### 2. Health Check Endpoints

```bash
# Basic health check
curl http://localhost:3000/health

# Detailed API health
curl http://localhost:3000/api/health

# Database status
curl http://localhost:3000/api/health/database
```

#### 3. Log Files

```bash
# Application logs (if configured)
tail -f logs/application.log

# Docker logs
docker-compose logs -f --tail=100

# System logs (Linux/Mac)
tail -f /var/log/system.log
```

### Still Having Issues?

1. **Check the GitHub Issues** for similar problems
2. **Review the deployment guide** for platform-specific issues
3. **Verify all prerequisites** are installed and configured
4. **Test with minimal configuration** (only required API keys)
5. **Try the Docker setup** if local development fails

## Development Workflow

### 1. Start Development
```bash
npm run dev
```

### 2. Make Changes
- Frontend code in `client/src/`
- Backend code in `server/`
- Shared utilities in `shared/`

### 3. Test Changes
```bash
# Run tests
npm test

# Test specific components
npm run test:client
npm run test:server
```

### 4. Build for Production
```bash
npm run build
```

## Project Structure

```
BookVid AI/
├── client/                  # React frontend
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── pages/         # Route components
│   │   ├── services/      # API calls
│   │   └── store/         # Redux store
├── server/                  # Node.js backend
│   ├── controllers/       # Route handlers
│   ├── models/           # Database models
│   ├── services/         # Business logic
│   └── utils/            # Helper functions
├── shared/                  # Shared utilities
├── data/                    # SQLite database
├── uploads/                 # File storage
├── docs/                    # Documentation
└── scripts/                 # Setup scripts
```

## Next Steps

1. **Configure API Keys**: Add your OpenAI and ElevenLabs API keys
2. **Test Video Generation**: Upload a book and generate a test video
3. **Customize Templates**: Modify video templates in the database
4. **Deploy**: Use the deployment guides for your preferred platform
5. **Portfolio Setup**: Configure demo mode for portfolio demonstration

## Additional Resources

- [Deployment Guide](deployment.md) - Production deployment options
- [API Documentation](api.md) - API endpoints and usage
- [Architecture Overview](architecture.md) - System design details

## Support

For issues:
1. Check this troubleshooting section
2. Review application logs
3. Verify API key configuration
4. Check the GitHub issues for similar problems