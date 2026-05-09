# Shotstack Integration Guide

## Overview

Shotstack is a cloud-based video rendering API that powers the actual video generation in BookVid. This guide covers setup, usage, and best practices.

## Setup

### 1. Get Your API Key

1. Sign up for a free account at [https://shotstack.io/](https://shotstack.io/)
2. Navigate to your Dashboard
3. Copy your API key from the API Keys section

### 2. Configure Environment Variables

Add to your `.env` file:

```bash
SHOTSTACK_API_KEY=your_api_key_here
SHOTSTACK_HOST=https://api.shotstack.io/stage/v1
SHOTSTACK_ENV=stage
```

**Environments:**
- `stage` - Free tier, watermarked videos (for development/testing)
- `production` - Paid tier, no watermark (for production use)

### 3. Verify Installation

Run the demo script:

```bash
node server/examples/shotstackDemo.js
```

You should see output showing successful video rendering.

## Usage

### Basic Example

```javascript
const shotstackService = require('./services/shotstackService');

// Create a simple video
const edit = shotstackService.createSimpleEdit({
  audioPath: 'https://example.com/audio.mp3',
  images: [
    {
      src: 'https://example.com/image1.jpg',
      start: 0,
      length: 5
    }
  ],
  text: [
    {
      content: 'Hello World',
      start: 0,
      length: 5
    }
  ],
  duration: 5
});

// Render the video
const renderResponse = await shotstackService.renderVideo(edit);
console.log('Render ID:', renderResponse.renderId);

// Wait for completion
const result = await shotstackService.waitForRender(renderResponse.renderId);
console.log('Video URL:', result.url);
```

### Advanced Example

```javascript
const Shotstack = require('shotstack-sdk');

// Create custom timeline
const timeline = {
  soundtrack: {
    src: 'https://example.com/audio.mp3',
    effect: 'fadeInFadeOut'
  },
  tracks: [
    {
      clips: [
        {
          asset: {
            type: 'video',
            src: 'https://example.com/video.mp4',
            trim: 5  // Start at 5 seconds
          },
          start: 0,
          length: 10,
          transition: {
            in: 'fade',
            out: 'fade'
          },
          effect: 'zoomIn'
        }
      ]
    }
  ]
};

const output = {
  format: 'mp4',
  resolution: '1080',
  fps: 30,
  quality: 'high'
};

const edit = new Shotstack.Edit(timeline, output);
const response = await shotstackService.renderVideo(edit);
```

## Service Features

### 1. Automatic Retries

The service automatically retries failed requests:
- Network errors
- 5xx server errors
- Rate limiting (429)
- Exponential backoff strategy

### 2. Comprehensive Logging

All operations are logged with timestamps:
```
🎬 [Shotstack] Starting video render...
✅ [Shotstack] Render queued successfully in 234ms
📊 [Shotstack] Render ID: abc-123-def
```

### 3. Status Monitoring

Check service health:
```javascript
const status = shotstackService.getStatus();
console.log(status);
// {
//   available: true,
//   environment: 'stage',
//   host: 'https://api.shotstack.io/stage/v1',
//   apiKeyConfigured: true,
//   maxRetries: 3
// }
```

### 4. Render Polling

Wait for renders to complete:
```javascript
const result = await shotstackService.waitForRender(renderId, {
  maxWaitTime: 300000,   // 5 minutes
  pollInterval: 5000      // Check every 5 seconds
});
```

## Video Composition

### Supported Assets

1. **Images**
   - JPG, PNG, GIF
   - URLs or local paths (must be publicly accessible)
   
2. **Videos**
   - MP4, MOV, AVI
   - Can trim and apply effects
   
3. **Audio**
   - MP3, WAV
   - Background music and voiceovers
   
4. **Text/HTML**
   - Custom HTML/CSS
   - Animated text overlays

### Effects & Transitions

**Transitions:**
- `fade`, `fadeIn`, `fadeOut`
- `wipe`, `slideLeft`, `slideRight`
- `slideUp`, `slideDown`
- `zoom`, `zoomIn`, `zoomOut`

**Effects:**
- `zoomIn`, `zoomOut`
- `slideLeft`, `slideRight`
- `slideUp`, `slideDown`

### Output Options

```javascript
const output = {
  format: 'mp4',           // mp4, gif, jpg, png, bmp, mp3
  resolution: '1080',      // 1080, 720, 576, 480, 360, 240
  fps: 30,                 // 12, 15, 23.976, 24, 25, 29.97, 30, 48, 50, 60
  quality: 'high'          // low, medium, high
};
```

## Error Handling

```javascript
try {
  const response = await shotstackService.renderVideo(edit);
} catch (error) {
  if (error instanceof ApiKeyError) {
    // Invalid or missing API key
    console.error('API key error:', error.message);
  } else if (error.message.includes('timeout')) {
    // Render took too long
    console.error('Render timeout');
  } else {
    // Other errors
    console.error('Render failed:', error.message);
  }
}
```

## Best Practices

### 1. Use Webhook Callbacks (Coming Soon)

Instead of polling, use webhooks for production:
```javascript
const edit = new Shotstack.Edit(timeline, output, callback);
// Shotstack will POST to your callback URL when done
```

### 2. Asset Hosting

- Host images/videos on CDN for best performance
- Ensure assets are publicly accessible
- Use HTTPS URLs

### 3. Optimize for Speed

- Use lower resolutions during development (720p)
- Keep videos under 30 seconds when possible
- Compress images before uploading

### 4. Cost Management

- Use staging environment for development
- Cache rendered videos when possible
- Consider video length in pricing

## Pricing

**Stage Environment (Free):**
- Watermarked videos
- Slower rendering
- Limited to 20 renders/month
- Perfect for development

**Production Environment:**
- No watermark
- Faster rendering
- Pay per render minute
- See [Shotstack Pricing](https://shotstack.io/pricing/)

## Troubleshooting

### Common Issues

**1. Invalid API Key**
```
Error: Shotstack render failed: 401 Unauthorized
```
Solution: Check `SHOTSTACK_API_KEY` in `.env`

**2. Asset Not Found**
```
Error: Asset could not be loaded
```
Solution: Ensure asset URLs are publicly accessible

**3. Render Timeout**
```
Error: Render timeout after 300 seconds
```
Solution: Increase `maxWaitTime` or check render status manually

### Getting Help

- [Shotstack Documentation](https://shotstack.io/docs/)
- [Shotstack Support](https://shotstack.io/support/)
- [API Status](https://status.shotstack.io/)

## Integration Status

- ✅ SDK Installed
- ✅ Service Wrapper Created
- ✅ API Key Validation
- ✅ Logging & Retry Logic
- ✅ Demo Example
- ⏳ Integration with VideoGenerationWorkflow
- ⏳ Webhook Support

## Next Steps

1. **Get API Key** - Sign up at shotstack.io
2. **Run Demo** - Test the integration
3. **Integrate with Workflow** - Connect to video generation pipeline
4. **Test End-to-End** - Generate real book videos
5. **Deploy** - Move to production environment

---

For more information, see the [Shotstack API Reference](https://shotstack.io/docs/api/).



