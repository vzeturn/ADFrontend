// Frontend/src/utils/auth.js

// Authentication utilities and helpers
class AuthUtils {
    constructor() {
        this.currentUser = null;
        this.sessionTimer = null;
        this.sessionExpiresAt = null;
    }

    // Check if user is authenticated
    isAuthenticated() {
        return !!this.getSessionId() && !!this.currentUser;
    }

    // Get current user
    getCurrentUser() {
        return this.currentUser;
    }

    // Set current user
    setCurrentUser(user) {
        this.currentUser = user;
        if (user) {
            localStorage.setItem('currentUser', JSON.stringify(user));
        } else {
            localStorage.removeItem('currentUser');
        }
    }

    // Load user from storage
    loadUserFromStorage() {
        const stored = localStorage.getItem('currentUser');
        if (stored) {
            try {
                this.currentUser = JSON.parse(stored);
            } catch (error) {
                console.error('Failed to parse stored user:', error);
                localStorage.removeItem('currentUser');
            }
        }
    }

    // Set session expiration and start timer
    setSessionExpiration(expiresAt) {
        this.sessionExpiresAt = new Date(expiresAt);
        this.startSessionTimer();
    }

    // Start session timer countdown
    startSessionTimer() {
        if (this.sessionTimer) {
            clearInterval(this.sessionTimer);
        }

        this.sessionTimer = setInterval(() => {
            this.updateSessionDisplay();
        }, 1000);
    }

    // Update session timer display
    updateSessionDisplay() {
        const timerElement = document.getElementById('session-timer');
        if (!timerElement || !this.sessionExpiresAt) return;

        const now = new Date();
        const timeLeft = this.sessionExpiresAt - now;

        if (timeLeft <= 0) {
            this.handleSessionExpired();
            return;
        }

        const minutes = Math.floor(timeLeft / (1000 * 60));
        const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

        timerElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;

        // Warn when session is about to expire
        if (timeLeft <= 5 * 60 * 1000) { // 5 minutes
            timerElement.className = 'text-warning fw-bold';
        }
        if (timeLeft <= 1 * 60 * 1000) { // 1 minute
            timerElement.className = 'text-danger fw-bold';
        }
    }

    // Handle session expiration
    handleSessionExpired() {
        if (this.sessionTimer) {
            clearInterval(this.sessionTimer);
        }
        
        this.showAlert('Your session has expired. Please login again.', 'warning');
        setTimeout(() => {
            this.logout();
        }, 2000);
    }

    // Get session ID
    getSessionId() {
        return localStorage.getItem('sessionId');
    }

    // Set session ID
    setSessionId(sessionId) {
        if (sessionId) {
            localStorage.setItem('sessionId', sessionId);
        } else {
            localStorage.removeItem('sessionId');
        }
    }

    // Login process
    async login(username, password, rememberMe = false) {
        try {
            // Import api dynamically to avoid circular dependency
            const { api } = await import('../services/api.js');
            const response = await api.login(username, password, rememberMe);
            
            if (response.success) {
                this.setCurrentUser(response.user);
                if (response.expiresAt) {
                    this.setSessionExpiration(response.expiresAt);
                }
                return response;
            } else {
                throw new Error(response.message);
            }
        } catch (error) {
            throw error;
        }
    }

    // Logout process
    async logout() {
        try {
            const { api } = await import('../services/api.js');
            await api.logout();
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            this.cleanup();
            // Use window.app if available, otherwise redirect
            if (window.app && typeof window.app.showPage === 'function') {
                window.app.showPage('login');
            } else {
                window.location.reload();
            }
        }
    }

    // Validate existing session
    async validateSession() {
        try {
            const { api } = await import('../services/api.js');
            const response = await api.validateSession();
            if (response.success && response.data?.User) {
                this.setCurrentUser(response.data.User);
                return true;
            } else {
                this.cleanup();
                return false;
            }
        } catch (error) {
            console.error('Session validation failed:', error);
            this.cleanup();
            return false;
        }
    }

    // Refresh session
    async refreshSession() {
        try {
            const { api } = await import('../services/api.js');
            const response = await api.refreshSession();
            if (response.success) {
                this.showAlert('Session refreshed successfully', 'success', 3000);
                return true;
            } else {
                throw new Error(response.message);
            }
        } catch (error) {
            console.error('Session refresh failed:', error);
            this.showAlert('Failed to refresh session', 'warning');
            return false;
        }
    }

    // Clean up authentication state
    cleanup() {
        this.currentUser = null;
        this.sessionExpiresAt = null;
        if (this.sessionTimer) {
            clearInterval(this.sessionTimer);
            this.sessionTimer = null;
        }
        this.setSessionId(null);
        localStorage.removeItem('currentUser');
    }

    // Format date for display
    formatDate(dateString) {
        if (!dateString) return 'Never';
        try {
            return new Date(dateString).toLocaleString();
        } catch {
            return 'Invalid Date';
        }
    }

    // Format relative time
    formatRelativeTime(dateString) {
        if (!dateString) return 'Never';
        try {
            const date = new Date(dateString);
            const now = new Date();
            const diff = now - date;
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const days = Math.floor(hours / 24);

            if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
            if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
            return 'Recently';
        } catch {
            return 'Unknown';
        }
    }

    // Show alert message
    showAlert(message, type = 'info', duration = 5000) {
        // Create alert element
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
        alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        document.body.appendChild(alertDiv);

        // Auto remove after duration
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, duration);
    }

    // Password strength validation
    validatePasswordStrength(password) {
        const criteria = {
            length: password.length >= 8,
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            number: /\d/.test(password),
            special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\?]/.test(password)
        };

        const score = Object.values(criteria).filter(Boolean).length;
        let strength = 'weak';
        
        if (score >= 5) strength = 'strong';
        else if (score >= 4) strength = 'good';
        else if (score >= 3) strength = 'fair';

        return { criteria, score, strength };
    }

    // Show/hide password toggle
    togglePasswordVisibility(inputId, buttonId) {
        const input = document.getElementById(inputId);
        const button = buttonId ? document.getElementById(buttonId) : input?.nextElementSibling;
        const icon = button?.querySelector('i');

        if (input && button && icon) {
            if (input.type === 'password') {
                input.type = 'text';
                icon.className = 'fas fa-eye-slash';
            } else {
                input.type = 'password';
                icon.className = 'fas fa-eye';
            }
        }
    }
}

// Session management functions
export function setSession(sessionId, user) {
    if (sessionId) {
        localStorage.setItem('sessionId', sessionId);
    }
    if (user) {
        localStorage.setItem('currentUser', JSON.stringify(user));
    }
}

export function getSession() {
    const sessionId = localStorage.getItem('sessionId');
    const userStr = localStorage.getItem('currentUser');
    
    if (!sessionId) return null;
    
    let user = null;
    if (userStr) {
        try {
            user = JSON.parse(userStr);
        } catch (error) {
            console.error('Failed to parse stored user:', error);
        }
    }
    
    return { sessionId, user };
}

export function clearSession() {
    localStorage.removeItem('sessionId');
    localStorage.removeItem('currentUser');
}

export function startSessionTimer(expiresIn, onExpire, onWarning) {
    const expiresAt = new Date(Date.now() + expiresIn * 1000);
    const warningTime = 5 * 60 * 1000; // 5 minutes before expiry
    
    const timer = setInterval(() => {
        const now = Date.now();
        const timeLeft = expiresAt - now;
        
        if (timeLeft <= 0) {
            clearInterval(timer);
            onExpire();
        } else if (timeLeft <= warningTime) {
            const minutesLeft = Math.ceil(timeLeft / (1000 * 60));
            onWarning(minutesLeft);
        }
    }, 1000);
    
    return timer;
}

export function autoRefreshSession(onSuccess, onError) {
    const refreshInterval = 15 * 60 * 1000; // 15 minutes
    
    const timer = setInterval(async () => {
        try {
            const { api } = await import('../services/api.js');
            const response = await api.refreshSession();
            
            if (response.success) {
                onSuccess();
            } else {
                throw new Error(response.message || 'Session refresh failed');
            }
        } catch (error) {
            console.error('Auto refresh failed:', error);
            onError();
        }
    }, refreshInterval);
    
    return timer;
}

export function togglePasswordVisibility(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    
    const button = input.nextElementSibling;
    if (!button) return;
    
    const icon = button.querySelector('i');
    if (!icon) return;
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.className = 'fas fa-eye-slash';
    } else {
        input.type = 'password';
        icon.className = 'fas fa-eye';
    }
}

// Create global auth instance
const auth = new AuthUtils();
window.auth = auth;

// Export for use in other files
export { auth };