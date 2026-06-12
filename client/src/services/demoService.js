// Demo service for portfolio demonstration
export const demoService = {
  // Demo user data
  demoUser: {
    id: 'demo-user-1',
    username: 'demo_user',
    email: 'demo@bookvid.ai',
    isDemo: true
  },

  // Sample books for demonstration
  sampleBooks: [
    {
      id: 'book-1',
      title: 'The Digital Revolution',
      author: 'Jane Smith',
      genre: 'Technology',
      description: 'A comprehensive guide to understanding how digital transformation is reshaping our world.',
      coverImagePath: '/api/placeholder/book-cover-1.jpg',
      content: 'In this digital age, technology continues to evolve at an unprecedented pace...',
      createdAt: new Date('2024-01-15'),
      status: 'published'
    },
    {
      id: 'book-2',
      title: 'Mindful Leadership',
      author: 'Dr. Michael Chen',
      genre: 'Business',
      description: 'Discover how mindfulness practices can transform your leadership approach.',
      coverImagePath: '/api/placeholder/book-cover-2.jpg',
      content: 'Leadership in the modern world requires more than just technical skills...',
      createdAt: new Date('2024-02-10'),
      status: 'published'
    },
    {
      id: 'book-3',
      title: 'The Art of Storytelling',
      author: 'Sarah Johnson',
      genre: 'Creative Writing',
      description: 'Master the craft of compelling storytelling across different mediums.',
      coverImagePath: '/api/placeholder/book-cover-3.jpg',
      content: 'Every great story begins with a single moment of inspiration...',
      createdAt: new Date('2024-03-05'),
      status: 'draft'
    }
  ],

  // Sample videos for demonstration
  sampleVideos: [
    {
      id: 'video-1',
      bookId: 'book-1',
      title: 'The Digital Revolution - Promotional Video',
      script: 'In a world where technology shapes every aspect of our lives, "The Digital Revolution" offers insights into the future...',
      templateId: 'template-modern',
      status: 'completed',
      videoPath: '/api/placeholder/video-1.mp4',
      thumbnailPath: '/api/placeholder/thumb-1.jpg',
      duration: 45,
      createdAt: new Date('2024-01-20')
    },
    {
      id: 'video-2',
      bookId: 'book-2',
      title: 'Mindful Leadership - Book Trailer',
      script: 'Transform your leadership style with the power of mindfulness. Dr. Michael Chen presents...',
      templateId: 'template-professional',
      status: 'completed',
      videoPath: '/api/placeholder/video-2.mp4',
      thumbnailPath: '/api/placeholder/thumb-2.jpg',
      duration: 60,
      createdAt: new Date('2024-02-15')
    },
    {
      id: 'video-3',
      bookId: 'book-3',
      title: 'The Art of Storytelling - Preview',
      script: 'Every story has the power to change lives. Learn the secrets of compelling storytelling...',
      templateId: 'template-creative',
      status: 'generating',
      progress: 75,
      createdAt: new Date('2024-03-10')
    }
  ],

  // Sample templates
  sampleTemplates: [
    {
      id: 'template-modern',
      name: 'Modern Tech',
      description: 'Clean, modern design perfect for technology and business books',
      category: 'Technology',
      previewImagePath: '/api/placeholder/template-modern.jpg'
    },
    {
      id: 'template-professional',
      name: 'Professional',
      description: 'Elegant and professional template for business and self-help books',
      category: 'Business',
      previewImagePath: '/api/placeholder/template-professional.jpg'
    },
    {
      id: 'template-creative',
      name: 'Creative Arts',
      description: 'Artistic and vibrant template for creative and fiction books',
      category: 'Creative',
      previewImagePath: '/api/placeholder/template-creative.jpg'
    },
    {
      id: 'template-minimal',
      name: 'Minimal',
      description: 'Clean and minimal design that works for any genre',
      category: 'Universal',
      previewImagePath: '/api/placeholder/template-minimal.jpg'
    }
  ],

  // Demo stats
  getDemoStats: () => ({
    books: 3,
    videos: 3,
    completedVideos: 2,
    successRate: 85
  }),

  // Initialize demo mode
  initializeDemoMode: () => {
    // Store demo data in localStorage for persistence during demo session
    localStorage.setItem('demo_mode', 'true');
    localStorage.setItem('demo_books', JSON.stringify(demoService.sampleBooks));
    localStorage.setItem('demo_videos', JSON.stringify(demoService.sampleVideos));
    localStorage.setItem('demo_templates', JSON.stringify(demoService.sampleTemplates));
    localStorage.setItem('demo_user', JSON.stringify(demoService.demoUser));
  },

  // Check if in demo mode
  isDemoMode: () => {
    return localStorage.getItem('demo_mode') === 'true';
  },

  // Get demo data
  getDemoBooks: () => {
    const stored = localStorage.getItem('demo_books');
    return stored ? JSON.parse(stored) : demoService.sampleBooks;
  },

  getDemoVideos: () => {
    const stored = localStorage.getItem('demo_videos');
    return stored ? JSON.parse(stored) : demoService.sampleVideos;
  },

  getDemoTemplates: () => {
    const stored = localStorage.getItem('demo_templates');
    return stored ? JSON.parse(stored) : demoService.sampleTemplates;
  },

  getDemoUser: () => {
    const stored = localStorage.getItem('demo_user');
    return stored ? JSON.parse(stored) : demoService.demoUser;
  },

  // Clear demo mode
  clearDemoMode: () => {
    localStorage.removeItem('demo_mode');
    localStorage.removeItem('demo_books');
    localStorage.removeItem('demo_videos');
    localStorage.removeItem('demo_templates');
    localStorage.removeItem('demo_user');
  },

  // Simulate API calls for demo
  simulateVideoGeneration: (bookId) => {
    return new Promise((resolve) => {
      // Simulate processing time
      setTimeout(() => {
        const newVideo = {
          id: `video-${Date.now()}`,
          bookId,
          title: `Generated Video - ${Date.now()}`,
          script: 'This is a demo video generated for portfolio demonstration...',
          templateId: 'template-modern',
          status: 'completed',
          videoPath: '/api/placeholder/generated-video.mp4',
          thumbnailPath: '/api/placeholder/generated-thumb.jpg',
          duration: 30,
          createdAt: new Date()
        };
        
        // Add to demo videos
        const currentVideos = demoService.getDemoVideos();
        currentVideos.push(newVideo);
        localStorage.setItem('demo_videos', JSON.stringify(currentVideos));
        
        resolve(newVideo);
      }, 3000); // 3 second simulation
    });
  }
};

export default demoService;