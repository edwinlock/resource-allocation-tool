// Application Configuration Constants
export const CONFIG = {
    ALLOCATABLE_BUDGET: 9,
    GAP_THRESHOLD: 6,
    MAX_SESSIONS: 15,
    // UI Constants
    ALERT_TIMEOUT_MS: 5000,
    DOM_SETUP_DELAY_MS: 100
};

// Chart Colors - colorblind-friendly matplotlib-style palette
export const COLORS = {
    CHILD1_COLOR: '#2ca02c',
    CHILD1_BG_COLOR: '#a8d4a8',
    CHILD1_DARK_COLOR: '#0f4c75',   // Dark blue for highlighting/text
    CHILD2_COLOR: '#ff7f0e',        // Matplotlib orange border
    CHILD2_BG_COLOR: '#ffc788',     // Light orange background
    CHILD2_DARK_COLOR: '#cc5500',   // Dark orange for highlighting/text
    COMBINED_COLOR: '#1f77b4',      // Matplotlib green border
    COMBINED_BG_COLOR: '#aecbea',   // Light green background
    LABEL_BG_COLOR: 'rgba(255, 255, 255, 0.9)',  // Semi-transparent white for labels
    LABEL_BORDER_COLOR: '#ccc'      // Light gray for label borders
};

// Note: Scenarios are now loaded from scenarios/scenarios.json
// See scenario-loader.js module

// API Configuration
export const API_CONFIG = {
    BACKEND_URL: 'https://learn.education-equity-technology.com', // Backend Flask app
    UPLOAD_TIMEOUT: 30000, // 30 seconds
    ENDPOINTS: {
        UPLOAD_SESSION: '/upload-session',
        HEALTH_CHECK: '/health',
        LOGIN: '/login',
        PROFILE: '/profile'
    }
};

