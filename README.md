# BookVid AI 🎬📚

**Personal Project** - AI-Powered Video Creation for Books

> **Note**: This is a personal, non-commercial version of BookVid AI, transformed from a commercial SaaS platform into a self-contained application for individual use, portfolio demonstration, and learning purposes.

Create stunning promotional videos for your books using AI-powered script generation, voice synthesis, and automated video composition. No subscriptions, no usage limits, no cloud dependencies - just your own AI-powered video creation tool.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-v18+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-v18+-blue.svg)](https://reactjs.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://www.docker.com/)

## 🚀 Features

- **AI-Powered Script Generation**: Analyze book content and create compelling video scripts using OpenAI
- **Voice Synthesis**: Generate professional voiceovers with ElevenLabs AI voices
- **Template System**: Customizable video templates for different book genres
- **Local File Storage**: All files stored locally - no cloud dependencies
- **Personal API Integration**: Use your own API keys for AI services
- **Demo Mode**: Portfolio-ready demonstration capabilities
- **Docker Ready**: Easy deployment with Docker containers

## 🏗️ Architecture

```
BookVid AI/
├── client/                  # React frontend application
├── server/                  # Node.js/Express backend
├── ai-services/             # Python AI/ML microservices
├── shared/                  # Shared code and types
├── docs/                    # Documentation
├── tests/                   # Test suites
└── scripts/                 # Utility scripts
```

## 🛠️ Tech Stack

### Frontend

- **React 18** with hooks and context
- **TailwindCSS** for styling
- **Redux Toolkit** for state management
- **React Router** for navigation
- **Vite** for build tooling

### Backend

- **Node.js** with Express framework
- **SQLite** for database (simplified for personal use)
- **In-memory caching** (no Redis dependency)
- **JWT** for authentication
- **Local file storage** (no cloud dependencies)

### AI Services Integration

- **OpenAI API** for script generation (your API key)
- **ElevenLabs API** for voice synthesis (your API key)
- **Stability AI** for image generation (optional, your API key)
- **FFmpeg** for video processing (included in Docker)

## 🚦 Quick Start

### Prerequisites

- Node.js 18+ (for local development)
- Docker & Docker Compose (recommended for deployment)
- Personal API keys:
  - [OpenAI API Key](https://platform.openai.com/) (required)
  - [ElevenLabs API Key](https://elevenlabs.io/) (required)
  - [Stability AI API Key](https://platform.stability.ai/) (optional)

### Option 1: Automated Setup (Recommended)

```bash
# Clone and run setup script
git clone <your-repo-url>
cd bookvid-ai
chmod +x scripts/setup.sh
./scripts/setup.sh
```

### Option 2: Manual Setup

1. **Clone the repository**

   ```bash
   git clone <your-repo-url>
   cd bookvid-ai
   ```

2. **Install dependencies**

   ```bash
   npm run install:all
   ```

3. **Configure environment**

   ```bash
   cp env.example .env
   # Edit .env with your API keys
   ```

4. **Start development servers**

   ```bash
   npm run dev
   ```

   Access the application:

   - Frontend: http://localhost:5173
   - API: http://localhost:3000
   - Health Check: http://localhost:3000/health

### Option 3: Docker Deployment

```bash
# Quick Docker setup
cp .env.docker .env
# Edit .env with your API keys
docker-compose up --build
```

Access at: http://localhost:3000

## 📖 Usage

### Creating Your First Video

1. **Upload Book Information**

   - Provide title, genre, and description
   - Add book cover and excerpts

2. **AI Analysis**

   - Our AI analyzes your content
   - Generates optimized video script
   - Suggests appropriate templates

3. **Customize Video**

   - Choose from 100+ templates
   - Select voice and music
   - Adjust timing and effects

4. **Generate & Share**
   - AI renders your video
   - Download in multiple formats
   - Share directly to social media

## 🧪 Testing

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:client
npm run test:server

# Run with coverage
npm run test:coverage
```

## 📚 API Documentation

Full API documentation is available at `/docs` when running the server, or view the [API documentation](docs/api.md).

### Key Endpoints

- `POST /api/books` - Create a new book
- `POST /api/videos` - Generate a new video
- `GET /api/templates` - List available templates
- `POST /api/ai/analyze-book` - Analyze book content

## 🚀 Deployment

This project supports multiple deployment options for personal use:

### Docker (Recommended)

```bash
# Production deployment
cp .env.docker .env
# Edit .env with your API keys
docker-compose up --build -d
```

### Platform Deployments

#### Railway

```bash
chmod +x scripts/deploy/railway.sh
./scripts/deploy/railway.sh
```

#### Heroku

```bash
chmod +x scripts/deploy/heroku.sh
./scripts/deploy/heroku.sh
```

#### Render

```bash
chmod +x scripts/deploy/render.sh
./scripts/deploy/render.sh
```

### Manual Deployment

1. Build the application: `npm run build`
2. Set production environment variables
3. Deploy to your hosting platform
4. Configure domain and SSL

📚 **Detailed deployment guide**: [docs/deployment.md](docs/deployment.md)

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📁 Project Structure

```
BookVid AI/
├── client/                  # React frontend
├── server/                  # Node.js backend
├── shared/                  # Shared utilities
├── docs/                    # Documentation
├── scripts/                 # Setup and deployment scripts
├── data/                    # SQLite database
├── uploads/                 # Local file storage
├── docker-compose.yml       # Production Docker setup
├── docker-compose.dev.yml   # Development Docker setup
└── Dockerfile              # Production container
```

## 🔧 Configuration

### Required Environment Variables

```bash
# AI Service API Keys (Required)
OPENAI_API_KEY=your_openai_api_key
ELEVENLABS_API_KEY=your_elevenlabs_key

# Application Configuration
NODE_ENV=production
PORT=3000
JWT_SECRET=your_secure_jwt_secret

# Database & Storage
DATABASE_PATH=./data/bookvid.db
UPLOAD_PATH=./uploads
```

See `env.example` for complete configuration options.

## 🌟 Personal Project Features

### What's Different from Commercial SaaS?

This personal version has been **simplified and transformed** from the original commercial platform:

**✅ Removed Commercial Features:**
- ❌ Stripe payment processing and subscriptions
- ❌ Complex user management and billing
- ❌ Usage limits and quota tracking
- ❌ Redis caching (replaced with in-memory)
- ❌ PostgreSQL (replaced with SQLite)
- ❌ AWS cloud dependencies

**✅ Added Personal Features:**
- ✅ **Your Own API Keys**: Use personal OpenAI, ElevenLabs accounts
- ✅ **Local Storage**: All files stored on your system
- ✅ **SQLite Database**: Lightweight, file-based database
- ✅ **Demo Mode**: Portfolio-ready demonstration capabilities
- ✅ **Docker Ready**: One-command deployment
- ✅ **No Limits**: Generate unlimited videos (API costs only)
- ✅ **Open Source**: MIT licensed, modify as needed

## 📚 Documentation

- **[Setup Guide](docs/setup.md)** - Complete setup instructions with API key configuration
- **[Deployment Guide](docs/deployment.md)** - Deploy to Railway, Heroku, Render, or Docker
- **[Architecture Overview](docs/architecture.md)** - Simplified architecture and removed features
- **[API Documentation](docs/api.md)** - API endpoints and usage
- **[Troubleshooting](docs/setup.md#troubleshooting)** - Common issues and solutions

### 🔄 Architecture Changes from Commercial Version

This personal version has been **significantly simplified**:

| Component | Commercial SaaS | Personal Version |
|-----------|----------------|------------------|
| Database | PostgreSQL + Redis | SQLite only |
| Authentication | Auth0/Cognito | Simple JWT |
| Storage | AWS S3 | Local filesystem |
| Payment | Stripe integration | Removed |
| Caching | Redis cluster | In-memory |
| Deployment | Microservices | Single container |

**Result**: Easier deployment, no cloud dependencies, perfect for personal use and portfolio demonstration.

## 🐛 Troubleshooting & Support

### Quick Fixes for Common Issues

#### 🔑 API Key Issues
```bash
# Test your OpenAI API key
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
  https://api.openai.com/v1/models

# Test ElevenLabs API key
curl -H "xi-api-key: $ELEVENLABS_API_KEY" \
  https://api.elevenlabs.io/v1/voices
```

#### 🗄️ Database Issues
```bash
# Check if database exists
ls -la data/bookvid.db

# Reinitialize database
cd server && npm run migrate
```

#### 📁 File Permission Issues
```bash
# Fix upload directory permissions
chmod -R 755 uploads/ data/
```

#### 🐳 Docker Issues
```bash
# View container logs
docker-compose logs -f

# Rebuild containers
docker-compose build --no-cache

# Reset everything
docker-compose down -v && docker-compose up --build
```

#### 🌐 Port Conflicts
```bash
# Check what's using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>
```

### Getting Help

1. **Check Logs**: Look at console output for error messages
2. **Verify Setup**: Ensure all API keys are correctly configured
3. **Review Docs**: Check [setup guide](docs/setup.md) and [deployment guide](docs/deployment.md)
4. **Test Components**: Use health check endpoints (`/health`, `/api/health`)

### Known Limitations

- **SQLite**: Single-user database, not suitable for high concurrency
- **In-Memory Cache**: Resets on application restart
- **Local Storage**: Files stored locally, no cloud backup
- **API Costs**: You pay for OpenAI/ElevenLabs usage directly

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

**Personal Project** - Built for learning, demonstration, and individual use.
