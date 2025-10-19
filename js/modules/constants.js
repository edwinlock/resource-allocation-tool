// Import environment-specific configuration
// Try config.local.js first (local dev), fall back to config.js (production/GitHub Pages)
// Using dynamic import with fallback
const loadConfig = async () => {
    try {
        const localConfig = await import('../config.local.js');
        console.log('Loaded local development config from config.local.js');
        return localConfig.ENV_CONFIG;
    } catch (error) {
        // config.local.js doesn't exist, use production config
        const prodConfig = await import('../config.js');
        console.log('Loaded production config from config.js');
        return prodConfig.ENV_CONFIG;
    }
};

const ENV_CONFIG = await loadConfig();

// Application Configuration Constants
export const CONFIG = {
    // UI Constants
    ALERT_TIMEOUT_MS: 5000,
    DOM_SETUP_DELAY_MS: 100
};

// Note: ALLOCATABLE_BUDGET, MAX_SESSIONS, and all chart colors are now loaded from scenarios JSON files
// See scenario-loader.js module for SCENARIOS_METADATA

// API Configuration (loaded from environment config)
export const API_CONFIG = {
    BACKEND_URL: ENV_CONFIG.BACKEND_URL,
    UPLOAD_TIMEOUT: ENV_CONFIG.UPLOAD_TIMEOUT,
    ENDPOINTS: ENV_CONFIG.ENDPOINTS
};

