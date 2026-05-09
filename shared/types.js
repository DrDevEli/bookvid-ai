// Shared TypeScript types (can be converted to .d.ts for TypeScript projects)

/**
 * @typedef {Object} Book
 * @property {string} id - Unique identifier
 * @property {string} title - Book title
 * @property {string} author - Book author
 * @property {string} genre - Book genre
 * @property {string} description - Book description
 * @property {string} coverImage - URL to cover image
 * @property {Date} createdAt - Creation timestamp
 * @property {Date} updatedAt - Last update timestamp
 */

/**
 * @typedef {Object} Video
 * @property {string} id - Unique identifier
 * @property {string} bookId - Associated book ID
 * @property {string} title - Video title
 * @property {string} script - Video script
 * @property {string} templateId - Template used
 * @property {Object} settings - Video generation settings
 * @property {string} status - Processing status
 * @property {string} url - Video file URL
 * @property {Date} createdAt - Creation timestamp
 */

/**
 * @typedef {Object} Template
 * @property {string} id - Unique identifier
 * @property {string} name - Template name
 * @property {string} category - Template category
 * @property {string} description - Template description
 * @property {string} previewUrl - Preview image/video URL
 * @property {Object} config - Template configuration
 */

/**
 * @typedef {Object} User
 * @property {string} id - Unique identifier
 * @property {string} email - User email
 * @property {string} name - User name
 * @property {string} plan - Subscription plan
 * @property {Date} createdAt - Account creation date
 */ 