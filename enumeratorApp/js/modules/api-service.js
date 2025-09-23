import { API_CONFIG } from './constants.js';

// Simple API service for uploading session data
export class APIService {
    constructor() {
        this.baseURL = API_CONFIG.BASE_URL;
        this.timeout = API_CONFIG.UPLOAD_TIMEOUT;
    }

    setBaseURL(url) {
        this.baseURL = url;
    }

    async uploadSession(sessionData) {
        if (!this.baseURL) {
            throw new Error('API base URL not configured');
        }

        const uploadURL = `${this.baseURL}${API_CONFIG.ENDPOINTS.UPLOAD_SESSION}`;

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.timeout);

            const response = await fetch(uploadURL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(sessionData),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                if (response.status >= 400 && response.status < 500) {
                    throw new Error(`Upload failed - client error (${response.status})`);
                } else if (response.status >= 500) {
                    throw new Error(`Upload failed - server error (${response.status})`);
                } else {
                    throw new Error(`Upload failed - HTTP ${response.status}`);
                }
            }

            const result = await response.json();
            return result;

        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('Upload failed - request timeout');
            } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                throw new Error('Upload failed - check internet connection');
            } else {
                throw error;
            }
        }
    }

    async testConnection() {
        if (!this.baseURL) {
            throw new Error('API base URL not configured');
        }

        const testURL = `${this.baseURL}${API_CONFIG.ENDPOINTS.HEALTH_CHECK}`;

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout for health check

            const response = await fetch(testURL, {
                method: 'GET',
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            return response.ok;

        } catch (error) {
            console.warn('Connection test failed:', error.message);
            return false;
        }
    }
}

// Create and export singleton instance
export const apiService = new APIService();