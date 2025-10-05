import { API_CONFIG } from './constants.js';

class APIService {
    constructor() {
        this.authToken = null;
        this.email = null;
        this.userId = null;
        this.loadStoredCredentials();
    }

    loadStoredCredentials() {
        try {
            this.authToken = localStorage.getItem('auth_token');
            this.email = localStorage.getItem('user_email');
            this.userId = localStorage.getItem('user_id');
        } catch (error) {
            console.warn('Could not load stored credentials:', error);
        }
    }

    storeCredentials(token, email, userId) {
        try {
            localStorage.setItem('auth_token', token);
            localStorage.setItem('user_email', email);
            localStorage.setItem('user_id', userId);

            this.authToken = token;
            this.email = email;
            this.userId = userId;
        } catch (error) {
            console.warn('Could not store credentials:', error);
        }
    }

    clearCredentials() {
        try {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user_email');
            localStorage.removeItem('user_id');

            this.authToken = null;
            this.email = null;
            this.userId = null;
        } catch (error) {
            console.warn('Could not clear credentials:', error);
        }
    }

    isAuthenticated() {
        return !!(this.authToken && this.email && this.userId);
    }

    async login(email, password) {
        const loginURL = `${API_CONFIG.BACKEND_URL}${API_CONFIG.ENDPOINTS.LOGIN}?include_auth_token`;

        console.log('Login attempt:', { url: loginURL, email: email });

        try {
            const response = await fetch(loginURL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: email,
                    password: password
                })
            });

            if (!response.ok) {
                // Handle different HTTP error codes with specific messages
                if (response.status === 400) {
                    // Bad request - typically wrong credentials format
                    throw new Error('Invalid credentials. Please check your email and password.');
                } else if (response.status === 401) {
                    // Unauthorized - wrong credentials
                    throw new Error('Invalid credentials. Please check your email and password.');
                } else if (response.status === 403) {
                    // Forbidden - account may be disabled or lacks permission
                    throw new Error('Access forbidden. Your account may be disabled. Please contact support.');
                } else if (response.status === 404) {
                    throw new Error('Authentication endpoint not found. Please contact support.');
                } else if (response.status === 500) {
                    throw new Error('Server error. Please try again later.');
                } else if (response.status === 503) {
                    throw new Error('Server is temporarily unavailable. Please try again later.');
                } else {
                    // Try to get error message from response
                    let errorMessage = `Server error (HTTP ${response.status})`;
                    try {
                        const errorData = await response.json();
                        console.error('Login error response:', errorData);
                        errorMessage = errorData.message || errorData.error || errorMessage;
                    } catch (e) {
                        console.error('Could not parse error response as JSON');
                    }
                    throw new Error(errorMessage);
                }
            }

            const result = await response.json();

            if (result.response && result.response.user && result.response.user.authentication_token) {
                const token = result.response.user.authentication_token;

                // Get user profile to get the user ID
                const profileData = await this.getProfile(token);

                this.storeCredentials(token, email, profileData.user_id);

                return {
                    success: true,
                    token,
                    email,
                    userId: profileData.user_id
                };
            } else {
                throw new Error('Invalid response format from server. Please contact support.');
            }
        } catch (error) {
            // CORS errors
            if (error instanceof TypeError && (
                error.message.includes('CORS') ||
                error.message.includes('Access-Control-Allow-Origin') ||
                error.message.includes('NetworkError')
            )) {
                throw new Error('Server blocked request (CORS error). The backend server needs to allow requests from this domain.');
            }
            // Network errors (server not reachable)
            if (error instanceof TypeError && error.message.includes('fetch')) {
                throw new Error('Cannot reach server. Please check your internet connection or verify the server is running.');
            }
            // Timeout errors
            if (error.name === 'AbortError') {
                throw new Error('Login request timed out. Please try again.');
            }
            // Re-throw our custom errors
            throw error;
        }
    }

    async getProfile(token = null) {
        const authToken = token || this.authToken;
        if (!authToken) {
            throw new Error('No authentication token available');
        }

        const profileURL = `${API_CONFIG.BACKEND_URL}${API_CONFIG.ENDPOINTS.PROFILE}`;

        try {
            const response = await fetch(profileURL, {
                method: 'GET',
                headers: {
                    'Authentication-Token': authToken
                }
            });

            if (!response.ok) {
                throw new Error('Failed to get user profile');
            }

            const result = await response.json();
            return result;
        } catch (error) {
            throw new Error(`Profile request failed: ${error.message}`);
        }
    }

    async uploadSession(sessionData) {
        if (!this.isAuthenticated()) {
            throw new Error('Not authenticated. Please log in first.');
        }

        const uploadURL = `${API_CONFIG.BACKEND_URL}${API_CONFIG.ENDPOINTS.UPLOAD_SESSION}`;

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.UPLOAD_TIMEOUT);

            const response = await fetch(uploadURL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authentication-Token': this.authToken
                },
                body: JSON.stringify(sessionData),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));

                // Build detailed error message
                let errorMessage = errorData.message || `Upload failed - HTTP ${response.status}`;

                // Add error details if available
                if (errorData.details) {
                    if (typeof errorData.details === 'string') {
                        errorMessage += `\nDetails: ${errorData.details}`;
                    } else if (errorData.details.error) {
                        errorMessage += `\nDetails: ${errorData.details.error}`;
                    } else if (errorData.details.session_id) {
                        errorMessage += `\nSession ID: ${errorData.details.session_id}`;
                    }
                }

                // Add error type if available
                if (errorData.error) {
                    errorMessage += `\nError type: ${errorData.error}`;
                }

                throw new Error(errorMessage);
            }

            const result = await response.json();
            return result;

        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('Upload timeout - request took too long');
            }
            throw error;
        }
    }
}

// Create and export singleton instance
export const apiService = new APIService();