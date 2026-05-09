#!/bin/bash

# BookVid AI Personal Project Setup Script
# This script helps set up the personal version for development and deployment

set -e

echo "🚀 BookVid AI Personal Project Setup"
echo "===================================="
echo ""
echo "This script will set up BookVid AI as a personal project."
echo "The personal version has been simplified from the commercial SaaS:"
echo "  ✅ No subscriptions or payments"
echo "  ✅ Uses your own API keys"
echo "  ✅ Local SQLite database"
echo "  ✅ Local file storage"
echo "  ✅ Docker ready"
echo ""

# Check Node.js version
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 18+ first."
    echo "   Visit: https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version $NODE_VERSION detected. Please upgrade to Node.js 18+."
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Check npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm not found. Please install npm."
    exit 1
fi

echo "✅ npm $(npm -v) detected"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
echo "This may take a few minutes..."
echo ""

npm run install:all

echo ""
echo "✅ Dependencies installed successfully"
echo ""

# Set up environment file
echo "🔧 Setting up environment configuration..."

if [ ! -f .env ]; then
    cp env.example .env
    echo "✅ Created .env file from template"
    
    echo ""
    echo "⚠️  IMPORTANT: Please edit .env file with your API keys:"
    echo "   - OPENAI_API_KEY: Required for script generation"
    echo "   - ELEVENLABS_API_KEY: Required for voice synthesis"
    echo "   - STABILITY_API_KEY: Optional for image generation"
    echo ""
    
    # Generate JWT secret
    if command -v openssl &> /dev/null; then
        JWT_SECRET=$(openssl rand -base64 32)
        # Update JWT_SECRET in .env file
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            sed -i '' "s/JWT_SECRET=your_jwt_secret_key_here/JWT_SECRET=$JWT_SECRET/" .env
        else
            # Linux
            sed -i "s/JWT_SECRET=your_jwt_secret_key_here/JWT_SECRET=$JWT_SECRET/" .env
        fi
        echo "✅ Generated secure JWT secret"
    fi
else
    echo "⚠️  .env file already exists, skipping creation"
fi

echo ""

# Create data directory
echo "📁 Setting up data directories..."
mkdir -p data
mkdir -p uploads/{covers,videos,thumbnails,audio,temp}
mkdir -p server/uploads/library/{backgrounds,music,videos}

echo "✅ Created data directories"
echo ""

# Initialize database
echo "🗄️  Initializing database..."
cd server
if npm run migrate 2>/dev/null; then
    echo "✅ Database initialized successfully"
else
    echo "⚠️  Database migration failed or already exists"
fi
cd ..

echo ""
echo "🎉 Setup complete!"
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. 🔑 Configure your API keys in .env:"
echo "   nano .env"
echo ""
echo "   Required API keys:"
echo "   - OPENAI_API_KEY: Get from https://platform.openai.com/"
echo "   - ELEVENLABS_API_KEY: Get from https://elevenlabs.io/"
echo "   - STABILITY_API_KEY: (Optional) Get from https://platform.stability.ai/"
echo ""
echo "2. 🚀 Start the development servers:"
echo "   npm run dev"
echo ""
echo "3. 🌐 Open your browser:"
echo "   - Frontend: http://localhost:5173"
echo "   - API: http://localhost:3000"
echo "   - Health Check: http://localhost:3000/health"
echo ""
echo "4. 🧪 Test the setup:"
echo "   curl http://localhost:3000/health"
echo ""
echo "🐳 Docker Alternative:"
echo "   cp .env.docker .env"
echo "   # Edit .env with your API keys"
echo "   docker-compose up --build"
echo ""
echo "📚 Documentation:"
echo "   - Setup Guide: docs/setup.md"
echo "   - Deployment Guide: docs/deployment.md"
echo "   - Architecture: docs/architecture.md"
echo "   - Troubleshooting: docs/setup.md#troubleshooting"
echo ""
echo "💡 Tips:"
echo "   - Start with the free tiers of OpenAI and ElevenLabs"
echo "   - Monitor your API usage to control costs"
echo "   - Use demo mode for portfolio demonstrations"
echo ""
echo "🆘 Need help? Check docs/setup.md#troubleshooting"