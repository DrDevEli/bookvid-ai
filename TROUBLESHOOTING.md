# BookVid AI - Troubleshooting Guide

## 🚨 **Common Issues & Solutions**

### **Error: "Unexpected token '<', "<!DOCTYPE "... is not valid JSON"**

This error means the API is returning HTML instead of JSON, which indicates:

#### **1. Server Not Running**
```bash
# Check if server is running
curl http://localhost:3000/health

# If not running, start it:
npm run dev
# OR
node server/server.js
```

#### **2. Wrong API URL**
Check your `.env` file:
```bash
# In your .env file, make sure:
API_URL=http://localhost:3000/api
CLIENT_URL=http://localhost:5173
```

#### **3. Port Conflicts**
```bash
# Check if port 3000 is in use:
lsof -i :3000

# If in use, kill the process:
kill -9 $(lsof -t -i:3000)
```

### **Error: "Request failed with status code 503"**

This means the server is running but services are unavailable:

#### **1. Missing API Keys**
Check your `.env` file has:
```bash
OPENAI_API_KEY=your_openai_key_here
ELEVENLABS_API_KEY=your_elevenlabs_key_here
STABILITY_API_KEY=your_stability_ai_key_here
```

#### **2. Invalid API Keys**
- Test your OpenAI key: https://platform.openai.com/api-keys
- Test your ElevenLabs key: https://elevenlabs.io/app/settings

#### **3. API Key Format**
Make sure keys don't have extra spaces or quotes:
```bash
# ✅ Correct:
OPENAI_API_KEY=sk-1234567890abcdef

# ❌ Wrong:
OPENAI_API_KEY="sk-1234567890abcdef"
OPENAI_API_KEY= sk-1234567890abcdef
```

## 🔧 **Step-by-Step Fix**

### **Step 1: Check Server Status**
```bash
# Terminal 1 - Start server:
cd /Users/emdesenvolvimento/Desktop/BookVid
npm run dev

# Terminal 2 - Test server:
curl http://localhost:3000/health
```

### **Step 2: Check API Keys**
```bash
# Check if .env exists:
ls -la .env

# If not, create it:
cp env.example .env

# Edit with your keys:
nano .env
```

### **Step 3: Test API Endpoints**
```bash
# Test basic health:
curl http://localhost:3000/health

# Test API health:
curl http://localhost:3000/api/health
```

### **Step 4: Check Frontend**
```bash
# Make sure frontend is running on port 5173:
curl http://localhost:5173
```

## 🐛 **Debug Commands**

### **Check Server Logs**
```bash
# Look for errors in server console
# Common errors:
# - "API key not found"
# - "Service unavailable"
# - "Database connection failed"
```

### **Test API Keys Manually**
```bash
# Test OpenAI:
curl -H "Authorization: Bearer YOUR_OPENAI_KEY" \
  https://api.openai.com/v1/models

# Test ElevenLabs:
curl -H "xi-api-key: YOUR_ELEVENLABS_KEY" \
  https://api.elevenlabs.io/v1/voices
```

### **Check Network**
```bash
# Test if ports are accessible:
telnet localhost 3000
telnet localhost 5173
```

## 🚀 **Quick Fix Script**

Create a file called `quick-fix.sh`:
```bash
#!/bin/bash
echo "🔧 BookVid AI Quick Fix"

# Kill any existing processes
echo "🛑 Stopping existing processes..."
pkill -f "node.*server"
pkill -f "vite"

# Check .env file
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp env.example .env
    echo "⚠️  Please edit .env with your API keys!"
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Start server
echo "🚀 Starting server..."
npm run dev
```

Make it executable:
```bash
chmod +x quick-fix.sh
./quick-fix.sh
```

## 📞 **Still Having Issues?**

1. **Check the debug component** in your dashboard
2. **Look at browser console** for JavaScript errors
3. **Check server console** for backend errors
4. **Verify API keys** are valid and have credits
5. **Test with a simple book** first

## 🎯 **Expected Working State**

When everything is working:
- ✅ Server responds to `http://localhost:3000/health`
- ✅ API responds to `http://localhost:3000/api/health`
- ✅ Frontend loads at `http://localhost:5173`
- ✅ Debug tests show green checkmarks
- ✅ Preview script works
- ✅ Video generation starts

## 🔍 **Debug Checklist**

- [ ] Server is running on port 3000
- [ ] Frontend is running on port 5173
- [ ] .env file exists with valid API keys
- [ ] No port conflicts
- [ ] API keys have sufficient credits
- [ ] Network connectivity is working
- [ ] No firewall blocking localhost
