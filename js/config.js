/**
 * Production Environment Configuration
 *
 * This file contains the DEFAULT production configuration.
 * It IS tracked in version control and deployed to GitHub Pages.
 *
 * For local development overrides:
 * 1. Copy this file to config.local.js (same directory)
 * 2. Update settings in config.local.js for your local environment
 * 3. config.local.js is gitignored and takes precedence when it exists
 *
 * The import logic in constants.js will:
 * - Try to load config.local.js first (local dev)
 * - Fall back to this file if config.local.js doesn't exist (GitHub Pages)
 */

export const ENV_CONFIG = {
    // Production backend API base URL (no trailing slash)
    BACKEND_URL: 'https://learn.education-equity-technology.com',

    // API timeout in milliseconds
    UPLOAD_TIMEOUT: 30000, // 30 seconds

    // API endpoints (relative to BACKEND_URL)
    ENDPOINTS: {
        UPLOAD_SESSION: '/upload-session',
        HEALTH_CHECK: '/health',
        LOGIN: '/login',
        PROFILE: '/profile'
    }
};
