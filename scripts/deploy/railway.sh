#!/bin/bash

# Railway Deployment Script for BookVid AI
# This script helps set up environment variables for Railway deployment

set -e

echo "🚀 BookVid AI Railway Deployment Setup"
echo "======================================"

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Please install it first:"
    echo "   npm install -g @railway/cli"
    echo "   or visit: https://docs.railway.app/develop/cli"
    exit 1
fi

# Check if user is logged in
if ! railway whoami &> /dev/null; then
    echo "🔐 Please log in to Railway first:"
    railway login
fi

echo ""
echo "📋 Setting up environment variables..."
echo ""

# Function to prompt for environment variable
set_env_var() {
    local var_name=$1
    local description=$2
    local is_required=${3:-false}
    
    echo "Setting $var_name ($description):"
    if [ "$is_required" = true ]; then
        echo "⚠️  This variable is REQUIRED"
    fi
    
    read -p "Enter value (or press Enter to skip): " value
    
    if [ -n "$value" ]; then
        railway variables set "$var_name=$value"
        echo "✅ Set $var_name"
    elif [ "$is_required" = true ]; then
        echo "❌ $var_name is required. Please provide a value."
        set_env_var "$var_name" "$description" "$is_required"
    else
        echo "⏭️  Skipped $var_name"
    fi
    echo ""
}

# Set required environment variables
echo "🔧 Required Configuration:"
railway variables set NODE_ENV=production
railway variables set PORT=3000
railway variables set DATABASE_PATH=/app/data/bookvid.db
railway variables set UPLOAD_PATH=/app/uploads
echo "✅ Set basic configuration"
echo ""

# Set API keys (required)
echo "🔑 API Keys (Required):"
set_env_var "OPENAI_API_KEY" "OpenAI API key for script generation" true
set_env_var "ELEVENLABS_API_KEY" "ElevenLabs API key for voice synthesis" true
set_env_var "STABILITY_API_KEY" "Stability AI API key for image generation" false

# Set JWT secret
echo "🔐 Security Configuration:"
echo "Generating secure JWT secret..."
JWT_SECRET=$(openssl rand -base64 32 2>/dev/null || head -c 32 /dev/urandom | base64)
railway variables set "JWT_SECRET=$JWT_SECRET"
echo "✅ Set JWT_SECRET (auto-generated)"
echo ""

# Set optional configuration
echo "⚙️  Optional Configuration:"
railway variables set CLIENT_URL=https://your-app.railway.app
railway variables set API_URL=https://your-app.railway.app
railway variables set MAX_FILE_SIZE=50000000
railway variables set CACHE_MAX_SIZE=1000
railway variables set CACHE_DEFAULT_TTL=3600
railway variables set SESSION_TTL=86400
echo "✅ Set optional configuration"
echo ""

# Display current variables
echo "📋 Current Environment Variables:"
railway variables
echo ""

echo "🎉 Railway deployment setup complete!"
echo ""
echo "Next steps:"
echo "1. Update CLIENT_URL and API_URL with your actual Railway domain"
echo "2. Push your code to trigger deployment:"
echo "   git add ."
echo "   git commit -m 'Deploy to Railway'"
echo "   git push"
echo ""
echo "3. Monitor deployment:"
echo "   railway logs"
echo ""
echo "4. Once deployed, update the URLs:"
echo "   railway variables set CLIENT_URL=https://your-actual-domain.railway.app"
echo "   railway variables set API_URL=https://your-actual-domain.railway.app"