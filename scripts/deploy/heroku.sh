#!/bin/bash

# Heroku Deployment Script for BookVid AI
# This script helps deploy BookVid AI to Heroku using Docker

set -e

echo "🚀 BookVid AI Heroku Deployment Setup"
echo "====================================="

# Check if Heroku CLI is installed
if ! command -v heroku &> /dev/null; then
    echo "❌ Heroku CLI not found. Please install it first:"
    echo "   Visit: https://devcenter.heroku.com/articles/heroku-cli"
    exit 1
fi

# Check if user is logged in
if ! heroku whoami &> /dev/null; then
    echo "🔐 Please log in to Heroku first:"
    heroku login
fi

# Get app name
echo ""
read -p "Enter your Heroku app name (or press Enter to create a new one): " APP_NAME

if [ -z "$APP_NAME" ]; then
    echo "Creating a new Heroku app..."
    APP_NAME=$(heroku create --json | grep -o '"name":"[^"]*' | cut -d'"' -f4)
    echo "✅ Created app: $APP_NAME"
else
    # Check if app exists
    if ! heroku apps:info -a "$APP_NAME" &> /dev/null; then
        echo "Creating app: $APP_NAME"
        heroku create "$APP_NAME"
    fi
fi

echo ""
echo "📦 Configuring Heroku app for Docker deployment..."

# Set stack to container
heroku stack:set container -a "$APP_NAME"
echo "✅ Set stack to container"

# Function to set environment variable
set_heroku_config() {
    local var_name=$1
    local description=$2
    local is_required=${3:-false}
    
    echo "Setting $var_name ($description):"
    if [ "$is_required" = true ]; then
        echo "⚠️  This variable is REQUIRED"
    fi
    
    read -p "Enter value (or press Enter to skip): " value
    
    if [ -n "$value" ]; then
        heroku config:set "$var_name=$value" -a "$APP_NAME"
        echo "✅ Set $var_name"
    elif [ "$is_required" = true ]; then
        echo "❌ $var_name is required. Please provide a value."
        set_heroku_config "$var_name" "$description" "$is_required"
    else
        echo "⏭️  Skipped $var_name"
    fi
    echo ""
}

echo ""
echo "🔧 Setting up environment variables..."

# Set required configuration
heroku config:set NODE_ENV=production -a "$APP_NAME"
heroku config:set PORT=3000 -a "$APP_NAME"
heroku config:set DATABASE_PATH=/app/data/bookvid.db -a "$APP_NAME"
heroku config:set UPLOAD_PATH=/app/uploads -a "$APP_NAME"
echo "✅ Set basic configuration"
echo ""

# Set API keys
echo "🔑 API Keys (Required):"
set_heroku_config "OPENAI_API_KEY" "OpenAI API key for script generation" true
set_heroku_config "ELEVENLABS_API_KEY" "ElevenLabs API key for voice synthesis" true
set_heroku_config "STABILITY_API_KEY" "Stability AI API key for image generation" false

# Generate and set JWT secret
echo "🔐 Generating secure JWT secret..."
JWT_SECRET=$(openssl rand -base64 32 2>/dev/null || head -c 32 /dev/urandom | base64)
heroku config:set "JWT_SECRET=$JWT_SECRET" -a "$APP_NAME"
echo "✅ Set JWT_SECRET (auto-generated)"
echo ""

# Set URLs
APP_URL="https://$APP_NAME.herokuapp.com"
heroku config:set "CLIENT_URL=$APP_URL" -a "$APP_NAME"
heroku config:set "API_URL=$APP_URL" -a "$APP_NAME"
echo "✅ Set application URLs"
echo ""

# Set optional configuration
heroku config:set MAX_FILE_SIZE=50000000 -a "$APP_NAME"
heroku config:set CACHE_MAX_SIZE=1000 -a "$APP_NAME"
heroku config:set CACHE_DEFAULT_TTL=3600 -a "$APP_NAME"
heroku config:set SESSION_TTL=86400 -a "$APP_NAME"
echo "✅ Set optional configuration"
echo ""

# Add git remote if it doesn't exist
if ! git remote get-url heroku &> /dev/null; then
    heroku git:remote -a "$APP_NAME"
    echo "✅ Added Heroku git remote"
fi

# Display configuration
echo "📋 Current Configuration:"
heroku config -a "$APP_NAME"
echo ""

echo "🎉 Heroku deployment setup complete!"
echo ""
echo "Your app will be available at: $APP_URL"
echo ""
echo "Next steps:"
echo "1. Deploy your application:"
echo "   git add ."
echo "   git commit -m 'Deploy to Heroku'"
echo "   git push heroku main"
echo ""
echo "2. Monitor deployment:"
echo "   heroku logs --tail -a $APP_NAME"
echo ""
echo "3. Open your app:"
echo "   heroku open -a $APP_NAME"
echo ""
echo "4. Scale dynos if needed:"
echo "   heroku ps:scale web=1 -a $APP_NAME"