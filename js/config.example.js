/**
 * Environment Configuration Template
 *
 * INSTRUCTIONS:
 * 1. Copy this file to config.js (same directory)
 * 2. Update settings below for your environment
 * 3. Do NOT commit config.js to version control (it's in .gitignore)
 *
 * For local development:
 *   - BACKEND_URL: 'http://localhost:5000'
 *
 * For production:
 *   - BACKEND_URL: 'https://your-production-backend.com'
 */

export const ENV_CONFIG = {
    // Backend API base URL (no trailing slash)
    BACKEND_URL: 'https://learn.education-equity-technology.com',

    // API timeout in milliseconds
    UPLOAD_TIMEOUT: 30000, // 30 seconds

    // API endpoints (relative to BACKEND_URL)
    // You typically don't need to change these unless backend routes change
    ENDPOINTS: {
        UPLOAD_SESSION: '/upload-session',
        HEALTH_CHECK: '/health',
        LOGIN: '/login',
        PROFILE: '/profile'
    }
};
