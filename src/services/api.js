// Frontend/src/services/api.js

// API service for communicating with backend
class ApiService {
    constructor() {
        this.baseUrl = 'https://localhost:7001/api'; // Backend URL
        this.sessionId = null;
    }

    // Set session ID for subsequent requests
    setSessionId(sessionId) {
        this.sessionId = sessionId;
        if (sessionId) {
            localStorage.setItem('sessionId', sessionId);
        } else {
            localStorage.removeItem('sessionId');
        }
    }

    // Get session ID from storage
    getSessionId() {
        if (!this.sessionId) {
            this.sessionId = localStorage.getItem('sessionId');
        }
        return this.sessionId;
    }

    // Generic HTTP request method
    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        // Add session ID to headers if available
        const sessionId = this.getSessionId();
        if (sessionId) {
            config.headers['X-Session-ID'] = sessionId;
        }

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || `HTTP error! status: ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    // Authentication methods
    async login(username, password, rememberMe = false) {
        try {
            const response = await this.request('/auth/login', {
                method: 'POST',
                body: JSON.stringify({
                    username,
                    password,
                    rememberMe
                })
            });

            if (response.success && response.sessionId) {
                this.setSessionId(response.sessionId);
            }

            return response;
        } catch (error) {
            throw new Error(error.message || 'Login failed');
        }
    }

    async logout() {
        try {
            const response = await this.request('/auth/logout', {
                method: 'POST'
            });

            this.setSessionId(null);
            return response;
        } catch (error) {
            // Even if logout fails, clear local session
            this.setSessionId(null);
            throw error;
        }
    }

    async validateSession() {
        try {
            return await this.request('/auth/validate');
        } catch (error) {
            // If session validation fails, clear it
            this.setSessionId(null);
            throw error;
        }
    }

    async getCurrentUser() {
        try {
            return await this.request('/auth/me');
        } catch (error) {
            throw new Error(error.message || 'Failed to get user information');
        }
    }

    async refreshSession() {
        try {
            return await this.request('/auth/refresh', {
                method: 'POST'
            });
        } catch (error) {
            throw new Error(error.message || 'Failed to refresh session');
        }
    }

    async getSessionInfo() {
        try {
            return await this.request('/auth/session-info');
        } catch (error) {
            throw new Error(error.message || 'Failed to get session info');
        }
    }

    // User management methods
    async getUserProfile() {
        try {
            return await this.request('/user/profile');
        } catch (error) {
            throw new Error(error.message || 'Failed to get user profile');
        }
    }

    async changePassword(currentPassword, newPassword, confirmPassword) {
        try {
            return await this.request('/user/change-password', {
                method: 'POST',
                body: JSON.stringify({
                    currentPassword,
                    newPassword,
                    confirmPassword
                })
            });
        } catch (error) {
            throw new Error(error.message || 'Failed to change password');
        }
    }

    async getAccountStatus() {
        try {
            return await this.request('/user/account-status');
        } catch (error) {
            throw new Error(error.message || 'Failed to get account status');
        }
    }

    async testADConnection() {
        try {
            return await this.request('/user/test-ad-connection');
        } catch (error) {
            throw new Error(error.message || 'Failed to test AD connection');
        }
    }

    // Health check
    async healthCheck() {
        try {
            const response = await fetch(`${this.baseUrl.replace('/api', '')}/health`);
            return await response.json();
        } catch (error) {
            throw new Error('Health check failed');
        }
    }
}

// Create global API instance
const api = new ApiService();

// Export for use in other files
window.api = api;