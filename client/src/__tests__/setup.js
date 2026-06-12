import { expect, afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import * as matchers from '@testing-library/jest-dom/matchers'

// Extend Vitest's expect with Testing Library matchers
expect.extend(matchers)

// Clean up after each test case
afterEach(() => {
  cleanup()
})

// Mock environment variables
vi.stubEnv('VITE_API_URL', 'http://localhost:3000/api')

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
vi.stubGlobal('localStorage', localStorageMock)

// Mock sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
vi.stubGlobal('sessionStorage', sessionStorageMock)

// Mock fetch
global.fetch = vi.fn()

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Global test utilities
global.testUtils = {
  createMockUser: () => ({
    id: 'test-user-123',
    username: 'testuser',
    email: 'test@example.com',
    created_at: new Date().toISOString()
  }),
  
  createMockBook: () => ({
    id: 'test-book-123',
    title: 'Test Book',
    author: 'Test Author',
    genre: 'Fiction',
    description: 'A test book for unit testing',
    created_at: new Date().toISOString()
  }),
  
  createMockVideo: () => ({
    id: 'test-video-123',
    title: 'Test Video',
    status: 'completed',
    duration: 60,
    created_at: new Date().toISOString()
  }),
  
  mockApiResponse: (data, status = 200) => ({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data))
  })
}