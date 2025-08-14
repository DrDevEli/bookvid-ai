# BookVid AI 🎬📚

AI-Powered Video Creation for Books - Transform your book marketing with stunning, automated videos that captivate readers and boost sales.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-v18+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-v18+-blue.svg)](https://reactjs.org/)

## 🚀 Features

- **AI-Powered Scriptwriting**: Analyze book content and generate compelling video scripts
- **Automated Media Selection**: Access millions of licensed images, videos, and music
- **Professional Voiceovers**: 50+ natural-sounding AI voices in multiple languages
- **Customizable Templates**: 100+ professionally designed templates for every genre
- **One-Click Sharing**: Direct integration with social media platforms
- **Analytics Dashboard**: Track video performance and engagement

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
- **PostgreSQL** for primary database
- **Redis** for caching and sessions
- **JWT** for authentication
- **AWS S3** for file storage

### AI Services
- **Python** with FastAPI
- **OpenAI GPT** for script generation
- **Stable Diffusion** for image generation
- **ElevenLabs** for voice synthesis
- **FFmpeg** for video processing

## 🚦 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.9+
- PostgreSQL 13+
- Redis 6+
- AWS account

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/bookvid-ai.git
   cd bookvid-ai
   ```

2. **Install dependencies**
   ```bash
   npm run install:all
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

4. **Start the development servers**
   ```bash
   npm run dev
   ```

   This will start:
   - Frontend: http://localhost:5173
   - Backend: http://localhost:3000
   - API Docs: http://localhost:3000/docs

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

### Using Docker

```bash
# Build and run with Docker Compose
docker-compose up --build
```

### Manual Deployment

1. Build the frontend: `npm run build:client`
2. Set production environment variables
3. Deploy to your hosting platform
4. Configure domain and SSL

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🌟 Support

- 📧 Email: support@bookvid.ai
- 💬 Discord: [Join our community](https://discord.gg/bookvid-ai)
- 📖 Documentation: [docs.bookvid.ai](https://docs.bookvid.ai)
- 🐛 Issues: [GitHub Issues](https://github.com/your-org/bookvid-ai/issues)

## 🔮 Roadmap

- [ ] Multi-language support
- [ ] Advanced video effects
- [ ] Batch video generation
- [ ] API integrations with publishing platforms
- [ ] Mobile app
- [ ] Real-time collaboration

---

Made with ❤️ by the BookVid AI Team # bookvid-ai
