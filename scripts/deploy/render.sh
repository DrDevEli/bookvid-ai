#!/bin/bash

# Render Deployment Guide for BookVid AI
# This script provides instructions for deploying to Render

set -e

echo "🚀 BookVid AI Render Deployment Guide"
echo "====================================="
echo ""
echo "Render doesn't have a CLI for automated setup, but here's how to deploy:"
echo ""

echo "📋 Step 1: Create Web Service"
echo "1. Go to https://render.com and sign up/login"
echo "2. Click 'New +' and select 'Web Service'"
echo "3. Connect your GitHub repository"
echo "4. Configure the service:"
echo "   - Name: bookvid-ai (or your preferred name)"
echo "   - Environment: Docker"
echo "   - Region: Choose closest to your users"
echo "   - Branch: main (or your default branch)"
echo ""

echo "📋 Step 2: Environment Variables"
echo "Add these environment variables in the Render dashboard:"
echo ""
echo "Required:"
echo "NODE_ENV=production"
echo "PORT=10000"
echo "DATABASE_PATH=/app/data/bookvid.db"
echo "UPLOAD_PATH=/app/uploads"
echo "OPENAI_API_KEY=your_openai_api_key"
echo "ELEVENLABS_API_KEY=your_elevenlabs_key"
echo ""

# Generate JWT secret for display
JWT_SECRET=$(openssl rand -base64 32 2>/dev/null || head -c 32 /dev/urandom | base64)
echo "JWT_SECRET=$JWT_SECRET"
echo ""

echo "Optional:"
echo "STABILITY_API_KEY=your_stability_ai_key"
echo "MAX_FILE_SIZE=50000000"
echo "CACHE_MAX_SIZE=1000"
echo "CACHE_DEFAULT_TTL=3600"
echo "SESSION_TTL=86400"
echo ""

echo "📋 Step 3: Deploy"
echo "1. Click 'Create Web Service'"
echo "2. Render will automatically build and deploy your app"
echo "3. Your app will be available at: https://your-service-name.onrender.com"
echo ""

echo "📋 Step 4: Update URLs"
echo "After deployment, update these environment variables with your actual URL:"
echo "CLIENT_URL=https://your-service-name.onrender.com"
echo "API_URL=https://your-service-name.onrender.com"
echo ""

echo "🎉 Render deployment guide complete!"
echo ""
echo "Note: Render's free tier may have limitations. Consider upgrading for production use."