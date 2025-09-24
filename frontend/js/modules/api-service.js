import { API_CONFIG } from './constants.js';

// Simple API service for uploading session data
export class APIService {
    constructor() {
        this.baseURL = API_CONFIG.BASE_URL;
        this.timeout = API_CONFIG.UPLOAD_TIMEOUT;
        this.apiKey = null;
        this.loadStoredCredentials();
    }

    // Load stored credentials from localStorage if available
    loadStoredCredentials() {
        try {
            this.apiKey = localStorage.getItem('research_auth_token');
            const storedBaseURL = localStorage.getItem('research_base_url');
            this.enumeratorName = localStorage.getItem('research_enumerator_name');
            this.enumeratorEmail = localStorage.getItem('research_enumerator_email');
            this.enumeratorId = localStorage.getItem('research_enumerator_id') || '1';

            if (storedBaseURL) {
                this.baseURL = storedBaseURL;
            }

            // Backward compatibility: keep username for old code
            this.username = this.enumeratorEmail || this.enumeratorName;
        } catch (error) {
            console.warn('Could not load stored credentials:', error);
        }
    }

    // Store authentication token and user info securely in localStorage
    setAuthToken(token, userInfo = {}, rememberMe = false) {
        this.apiKey = token;
        this.enumeratorName = userInfo.name || userInfo.username || 'Unknown';
        this.enumeratorEmail = userInfo.email || userInfo.username || '';
        this.enumeratorId = userInfo.enumeratorId || '1'; // Use placeholder value of 1 for now

        try {
            if (token && rememberMe) {
                localStorage.setItem('research_auth_token', token);
                localStorage.setItem('research_enumerator_name', this.enumeratorName);
                localStorage.setItem('research_enumerator_email', this.enumeratorEmail);
                localStorage.setItem('research_enumerator_id', this.enumeratorId);
                if (this.baseURL) {
                    localStorage.setItem('research_base_url', this.baseURL);
                }
            } else if (!rememberMe) {
                // Clear stored credentials if user doesn't want to be remembered
                this.clearStoredCredentials();
            }
        } catch (error) {
            console.warn('Could not store auth token:', error);
        }
    }

    // Clear only stored credentials, keep session token
    clearStoredCredentials() {
        try {
            localStorage.removeItem('research_auth_token');
            localStorage.removeItem('research_enumerator_name');
            localStorage.removeItem('research_enumerator_email');
            localStorage.removeItem('research_enumerator_id');
            localStorage.removeItem('research_base_url');
            // Backward compatibility
            localStorage.removeItem('research_username');
        } catch (error) {
            console.warn('Could not clear stored credentials:', error);
        }
    }

    // Check if we have authentication configured
    isAuthenticated() {
        return !!(this.apiKey && this.baseURL);
    }

    // Clear all credentials and log out
    clearCredentials() {
        this.apiKey = null;
        this.enumeratorName = null;
        this.enumeratorEmail = null;
        this.enumeratorId = null;
        this.username = null; // Backward compatibility
        this.clearStoredCredentials();
    }

    // Login with username and password to get auth token
    async login(username, password, rememberMe = false) {
        if (!this.baseURL) {
            throw new Error('API base URL not configured');
        }

        const loginURL = `${this.baseURL}/login`;

        try {
            const response = await fetch(loginURL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: username,  // flask-security-too uses email field
                    password: password
                })
            });

            if (!response.ok) {
                if (response.status === 400) {
                    throw new Error('Invalid username or password');
                } else if (response.status === 401) {
                    throw new Error('Authentication failed - check credentials');
                } else if (response.status >= 500) {
                    throw new Error('Server error - please try again later');
                } else {
                    throw new Error(`Login failed - HTTP ${response.status}`);
                }
            }

            const result = await response.json();

            // flask-security-too returns the token in response.user.authentication_token
            if (result.response && result.response.user && result.response.user.authentication_token) {
                const token = result.response.user.authentication_token;
                const user = result.response.user;

                // TODO: Replace with actual backend data when ready
                const userInfo = {
                    name: 'John Doe', // Dummy name
                    email: username, // Use entered email
                    enumeratorId: '1', // Dummy enumerator ID
                    username: username
                };

                this.setAuthToken(token, userInfo, rememberMe);
                return {
                    success: true,
                    token: token,
                    user: user,
                    userInfo: userInfo
                };
            } else {
                throw new Error('Invalid response format - no authentication token received');
            }

        } catch (error) {
            if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                throw new Error('Network error - check internet connection and API URL');
            } else {
                throw error;
            }
        }
    }

    // Check if current token is still valid
    async validateToken() {
        if (!this.apiKey || !this.baseURL) {
            return false;
        }

        try {
            // Use a simple endpoint to test token validity
            const response = await fetch(`${this.baseURL}/profile`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Authentication-Token': this.apiKey
                }
            });

            return response.ok;
        } catch (error) {
            console.warn('Token validation failed:', error);
            return false;
        }
    }

    setBaseURL(url) {
        this.baseURL = url;
    }

    async uploadSession(sessionData) {
        if (!this.baseURL) {
            throw new Error('API base URL not configured');
        }

        if (!this.apiKey) {
            throw new Error('Not authenticated. Please log in first.');
        }

        const uploadURL = `${this.baseURL}${API_CONFIG.ENDPOINTS.UPLOAD_SESSION}`;

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.timeout);

            const headers = {
                'Content-Type': 'application/json',
                'Authentication-Token': this.apiKey  // flask-security-too format
            };

            const response = await fetch(uploadURL, {
                method: 'POST',
                headers: headers,
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