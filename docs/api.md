# BookVid AI API Documentation

## Overview
BookVid AI provides REST API endpoints for creating AI-powered book videos.

## Base URL
```
https://api.bookvid.ai/v1
```

## Authentication
All API requests require authentication using API keys:
```
Authorization: Bearer YOUR_API_KEY
```

## Endpoints

### Books
- `GET /api/books` - List user's books
- `POST /api/books` - Create a new book
- `GET /api/books/:id` - Get book details
- `PUT /api/books/:id` - Update book
- `DELETE /api/books/:id` - Delete book

### Videos
- `GET /api/videos` - List user's videos
- `POST /api/videos` - Create a new video
- `GET /api/videos/:id` - Get video details
- `PUT /api/videos/:id` - Update video
- `DELETE /api/videos/:id` - Delete video

### Templates
- `GET /api/templates` - List available templates
- `GET /api/templates/:id` - Get template details

### AI Services
- `POST /api/ai/analyze-book` - Analyze book content
- `POST /api/ai/generate-script` - Generate video script
- `POST /api/ai/render-video` - Render final video

## Error Responses
```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {}
}
``` 