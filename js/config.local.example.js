/**
 * Local Development Configuration Template
 *
 * INSTRUCTIONS FOR LOCAL DEVELOPMENT:
 * 1. Copy this file to config.local.js (same directory)
 * 2. Update BACKEND_URL to point to your local backend
 * 3. config.local.js is gitignored and will override the production config.js
 *
 * The production config (config.js) is versioned and deployed to GitHub Pages.
 * This local override allows you to develop against localhost without modifying versioned files.
 */

export const ENV_CONFIG = {
    // Local development backend URL (no trailing slash)
    BACKEND_URL: 'http://localhost:5001',

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
