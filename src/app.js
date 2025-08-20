import { login, logout, getProfile, changePassword, getAccountStatus, validateSession, testADConnection as apiTestADConnection } from './services/api.js';
import { 
    setSession, 
    getSession, 
    clearSession, 
    startSessionTimer, 
    autoRefreshSession, 
    togglePasswordVisibility 
} from './utils/auth.js';

// Constants
const SESSION_WARNING_MINUTES = 5;
const TOAST_TYPES = {
    SUCCESS: { icon: 'fa-check-circle', class: 'bg-success text-white' },
    ERROR: { icon: 'fa-exclamation-circle', class: 'bg-danger text-white' },
    WARNING: { icon: 'fa-exclamation-triangle', class: 'bg-warning' },
    INFO: { icon: 'fa-info-circle', class: 'bg-info text-white' }
};

// Global toast instance
let toastInstance = null;

class App {
    constructor() {
        this.currentPage = 'login';
        this.isAuthenticated = false;
        this.sessionTimer = null;
        this.autoRefreshTimer = null;
        this.init();
    }

    async init() {
        // Initialize Bootstrap toast
        this.initializeToast();
        
        // Check existing session
        const session = getSession();
        
        if (session) {
            try {
                const sessionInfo = await validateSession();
                this.initializeAuthenticated(sessionInfo);
            } catch (error) {
                console.error('Session validation failed:', error);
                this.initializeUnauthenticated();
            }
        } else {
            this.initializeUnauthenticated();
        }

        // Setup global event listeners
        this.setupGlobalListeners();
    }

    initializeToast() {
        const toastElement = document.getElementById('toast');
        if (toastElement) {
            toastInstance = new bootstrap.Toast(toastElement);
        }
    }

    async initializeAuthenticated(sessionInfo) {
        this.isAuthenticated = true;
        this.setupAuthenticatedUI();
        
        try {
            let effectiveSessionInfo = sessionInfo;
            // Fetch session info if missing or incomplete
            if (!effectiveSessionInfo || (!effectiveSessionInfo.expiresIn && !effectiveSessionInfo.expiresAt)) {
                try {
                    effectiveSessionInfo = await validateSession();
                } catch (e) {
                    console.warn('Could not fetch session info, proceeding without timer');
                }
            }

            const [profile, status] = await Promise.all([
                getProfile(),
                getAccountStatus()
            ]);

            this.renderDashboard(profile, status, effectiveSessionInfo);
            this.setupDashboardListeners();
            this.startSessionManagement(effectiveSessionInfo);
            
            this.showToast('Welcome', 'Successfully authenticated', 'SUCCESS');
        } catch (error) {
            console.error('Dashboard initialization error:', error);
            this.initializeUnauthenticated();
            this.showToast('Error', 'Failed to load dashboard', 'ERROR');
        }
    }

    initializeUnauthenticated() {
        this.isAuthenticated = false;
        this.setupUnauthenticatedUI();
        this.setupLoginListeners();
    }

    setupAuthenticatedUI() {
        const session = getSession();
        const userDisplayName = document.getElementById('userDisplayName');
        const userNav = document.getElementById('userNav');
        const loginPage = document.getElementById('loginPage');
        const dashboardPage = document.getElementById('dashboardPage');

        if (userDisplayName) {
            userDisplayName.textContent = session.user?.displayName || session.user?.username || 'User';
        }
        
        if (userNav) userNav.classList.remove('d-none');
        if (loginPage) loginPage.classList.add('d-none');
        if (dashboardPage) dashboardPage.classList.remove('d-none');
    }

    setupUnauthenticatedUI() {
        const userNav = document.getElementById('userNav');
        const loginPage = document.getElementById('loginPage');
        const dashboardPage = document.getElementById('dashboardPage');

        if (userNav) userNav.classList.add('d-none');
        if (loginPage) loginPage.classList.remove('d-none');
        if (dashboardPage) dashboardPage.classList.add('d-none');
    }

    setupGlobalListeners() {
        // Password visibility toggles
        const togglePasswordBtn = document.getElementById('togglePassword');
        if (togglePasswordBtn) {
            togglePasswordBtn.addEventListener('click', () => this.togglePasswordVisibility('password'));
        }

        // Password strength monitoring
        this.setupPasswordStrengthMonitoring();

        // Change password form
        const changePasswordForm = document.getElementById('changePasswordForm');
        if (changePasswordForm) {
            changePasswordForm.addEventListener('submit', this.handleChangePasswordForm.bind(this));
        }
    }

    setupLoginListeners() {
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', this.handleLogin.bind(this));
        }
    }

    setupDashboardListeners() {
        const passwordForm = document.getElementById('passwordForm');
        const logoutBtn = document.getElementById('logoutBtn');

        if (passwordForm) {
            passwordForm.addEventListener('submit', this.handlePasswordChange.bind(this));
        }
        
        if (logoutBtn) {
            logoutBtn.addEventListener('click', this.handleLogout.bind(this));
        }
    }

    setupPasswordStrengthMonitoring() {
        const newPasswordInput = document.getElementById('newPassword');
        const newPasswordChangeInput = document.getElementById('newPasswordChange');

        if (newPasswordInput) {
            newPasswordInput.addEventListener('input', (e) => this.updatePasswordStrength(e.target.value, 'passwordStrength'));
        }

        if (newPasswordChangeInput) {
            newPasswordChangeInput.addEventListener('input', (e) => this.updatePasswordStrength(e.target.value, 'passwordStrengthChange'));
        }
    }

    updatePasswordStrength(password, elementId) {
        const strengthElement = document.getElementById(elementId);
        const strengthBar = document.getElementById('passwordStrengthBar');
        const strengthText = document.getElementById('passwordStrengthText');

        if (!strengthElement) return;

        const strength = this.calculatePasswordStrength(password);
        
        // Update strength indicator
        strengthElement.className = `password-strength ${strength}`;
        
        // Update progress bar if available
        if (strengthBar) {
            const width = strength === 'weak' ? '25%' : strength === 'fair' ? '50%' : strength === 'good' ? '75%' : '100%';
            strengthBar.style.width = width;
            strengthBar.className = `progress-bar ${this.getProgressBarClass(strength)}`;
        }

        // Update text if available
        if (strengthText) {
            strengthText.textContent = `Password strength: ${strength.charAt(0).toUpperCase() + strength.slice(1)}`;
        }
    }

    calculatePasswordStrength(password) {
        if (!password) return 'weak';
        
        const criteria = {
            length: password.length >= 8,
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            number: /\d/.test(password),
            special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\?]/.test(password)
        };

        const score = Object.values(criteria).filter(Boolean).length;
        
        if (score >= 5) return 'strong';
        if (score >= 4) return 'good';
        if (score >= 3) return 'fair';
        return 'weak';
    }

    getProgressBarClass(strength) {
        switch (strength) {
            case 'weak': return 'bg-danger';
            case 'fair': return 'bg-warning';
            case 'good': return 'bg-info';
            case 'strong': return 'bg-success';
            default: return 'bg-secondary';
        }
    }

    startSessionManagement(sessionInfoOrExpires) {
        // Clear existing timers
        if (this.sessionTimer) clearTimeout(this.sessionTimer);
        if (this.autoRefreshTimer) clearInterval(this.autoRefreshTimer);

        const expiresInSeconds = this.getExpiresInSeconds(sessionInfoOrExpires);
        if (!expiresInSeconds || expiresInSeconds <= 0) {
            return; // No timer if we cannot determine expiry
        }

        // Start session countdown
        this.sessionTimer = startSessionTimer(
            expiresInSeconds,
            () => {
                this.handleSessionExpired();
            },
            (minutesLeft) => {
                this.showSessionWarning(minutesLeft);
            }
        );

        // Start auto-refresh
        this.autoRefreshTimer = autoRefreshSession(
            () => {
                console.log('Session refreshed');
                this.showToast('Session Refreshed', 'Your session has been extended', 'SUCCESS');
            },
            () => {
                this.handleSessionExpired();
            }
        );
    }

    getExpiresInSeconds(sessionInfoOrExpires) {
        if (typeof sessionInfoOrExpires === 'number') return sessionInfoOrExpires;
        const si = sessionInfoOrExpires || {};
        if (typeof si.expiresIn === 'number') return si.expiresIn;
        if (typeof si.expiresInSeconds === 'number') return si.expiresInSeconds;
        if (si.expiresAt) {
            const ms = new Date(si.expiresAt).getTime() - Date.now();
            return ms > 0 ? Math.floor(ms / 1000) : 0;
        }
        return null;
    }

    handleSessionExpired() {
        clearSession();
        this.initializeUnauthenticated();
        this.showToast('Session Expired', 'Please login again', 'WARNING');
    }

    showSessionWarning(minutesLeft) {
        const sessionAlert = document.getElementById('sessionAlert');
        const sessionMessage = document.getElementById('sessionMessage');
        
        if (sessionAlert && sessionMessage) {
            sessionMessage.textContent = `Your session will expire in ${minutesLeft} minutes`;
            sessionAlert.classList.remove('d-none');
            sessionAlert.classList.add('show');
        }
    }

    async handleLogin(event) {
        event.preventDefault();
        this.showLoading();
        
        const username = document.getElementById('username')?.value?.trim();
        const password = document.getElementById('password')?.value;
        const rememberMe = document.getElementById('rememberMe')?.checked;
        const loginError = document.getElementById('loginError');
        
        if (!username || !password) {
            this.showError(loginError, 'Please enter both username and password');
            this.hideLoading();
            return;
        }
        
        try {
            const response = await login(username, password, rememberMe);
            setSession(response.sessionId, response.user);
            // Try to get session info after login; fall back to response.sessionInfo if present
            let sessionInfo = response.sessionInfo;
            if (!sessionInfo) {
                try {
                    sessionInfo = await validateSession();
                } catch (e) {
                    console.warn('validateSession failed after login; continuing without timer');
                }
            }
            await this.initializeAuthenticated(sessionInfo);
        } catch (error) {
            console.error('Login error:', error);
            this.showError(loginError, error.message || 'Login failed');
        } finally {
            this.hideLoading();
        }
    }

    async handleLogout() {
        this.showLoading();
        try {
            await logout();
            clearSession();
            this.initializeUnauthenticated();
            this.showToast('Success', 'Logged out successfully', 'INFO');
        } catch (error) {
            console.error('Logout error:', error);
            this.showToast('Error', 'Logout failed', 'ERROR');
        } finally {
            this.hideLoading();
        }
    }

    async handlePasswordChange(event) {
        event.preventDefault();
        this.showLoading();
        
        const newPassword = document.getElementById('newPassword')?.value;
        const confirmPassword = document.getElementById('confirmPassword')?.value;
        const feedback = document.getElementById('passwordFeedback');
        
        if (newPassword !== confirmPassword) {
            this.showError(feedback, 'Passwords do not match');
            this.hideLoading();
            return;
        }
        
        try {
            await changePassword(newPassword);
            this.showSuccess(feedback, 'Password changed successfully');
            event.target.reset();
            
            // Auto logout after password change
            setTimeout(() => {
                this.handleLogout();
            }, 3000);
        } catch (error) {
            console.error('Password change error:', error);
            this.showError(feedback, error.message || 'Failed to change password');
        } finally {
            this.hideLoading();
        }
    }

    async handleChangePasswordForm(event) {
        event.preventDefault();
        
        const currentPassword = document.getElementById('currentPassword')?.value;
        const newPassword = document.getElementById('newPasswordChange')?.value;
        const confirmPassword = document.getElementById('confirmPasswordChange')?.value;
        const errorDiv = document.getElementById('passwordError');
        const successDiv = document.getElementById('passwordSuccess');
        const changeBtn = document.getElementById('changePasswordBtn');
        const spinner = document.getElementById('changePasswordSpinner');

        if (!currentPassword || !newPassword || !confirmPassword) {
            this.showError(errorDiv, 'Please fill in all fields');
            return;
        }

        if (newPassword !== confirmPassword) {
            this.showError(errorDiv, 'New passwords do not match');
            return;
        }

        // Show loading state
        changeBtn.disabled = true;
        spinner.classList.remove('d-none');
        this.hideError(errorDiv);
        this.hideSuccess(successDiv);

        try {
            const response = await changePassword(newPassword);
            
            if (response.success) {
                this.showSuccess(successDiv, 'Password changed successfully! You will be logged out.');
                setTimeout(() => {
                    this.handleLogout();
                }, 2000);
            } else {
                this.showError(errorDiv, response.message || 'Failed to change password');
            }
        } catch (error) {
            console.error('Change password error:', error);
            this.showError(errorDiv, error.message || 'Failed to change password');
        } finally {
            changeBtn.disabled = false;
            spinner.classList.add('d-none');
        }
    }

    showPage(pageName) {
        this.currentPage = pageName;
        this.hideAllPages();
        
        const pageElement = document.getElementById(this.getPageId(pageName));
        if (pageElement) {
            pageElement.classList.remove('d-none');
        }

        // Load page-specific content
        switch (pageName) {
            case 'dashboard':
                this.loadDashboardContent();
                break;
            case 'profile':
                this.loadProfile();
                break;
            case 'change-password':
                this.loadChangePasswordPage();
                break;
            case 'account-status':
                this.loadAccountStatus();
                break;
        }
    }

    getPageId(pageName) {
        const pageMap = {
            'dashboard': 'dashboardPage',
            'profile': 'profilePage',
            'change-password': 'changePasswordPage',
            'account-status': 'accountStatusPage'
        };
        return pageMap[pageName] || 'dashboardPage';
    }

    hideAllPages() {
        const pages = ['dashboardPage', 'profilePage', 'changePasswordPage', 'accountStatusPage'];
        pages.forEach(pageId => {
            const page = document.getElementById(pageId);
            if (page) page.classList.add('d-none');
        });
    }

    async loadDashboardContent() {
        try {
            const [profile, status] = await Promise.all([
                getProfile(),
                getAccountStatus()
            ]);
            this.renderDashboard(profile, status);
        } catch (error) {
            console.error('Failed to load dashboard content:', error);
        }
    }

    async loadProfile() {
        const loadingDiv = document.getElementById('profileLoading');
        const contentDiv = document.getElementById('profileContent');
        const errorDiv = document.getElementById('profileError');

        this.showLoading(loadingDiv);
        this.hideContent(contentDiv);
        this.hideError(errorDiv);

        try {
            const response = await getProfile();
            
            if (response.success && response.data) {
                const user = response.data;
                this.updateProfileDisplay(user);
                this.showContent(contentDiv);
            } else {
                throw new Error(response.message || 'Failed to load profile');
            }
        } catch (error) {
            console.error('Load profile error:', error);
            this.showError(errorDiv, error.message || 'Failed to load profile');
        } finally {
            this.hideLoading(loadingDiv);
        }
    }

    updateProfileDisplay(user) {
        const fields = {
            'profileUsername': user.username,
            'profileDisplayname': user.displayName,
            'profileFirstname': user.firstName,
            'profileLastname': user.lastName,
            'profileEmail': user.email,
            'profileStatus': user.isEnabled ? '<span class="status-enabled">Enabled</span>' : '<span class="status-disabled">Disabled</span>',
            'profileLastlogin': this.formatDate(user.lastLogin),
            'profilePasswordset': this.formatDate(user.passwordLastSet)
        };

        Object.entries(fields).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.innerHTML = value || '-';
            }
        });
    }

    async loadAccountStatus() {
        const loadingDiv = document.getElementById('statusLoading');
        const contentDiv = document.getElementById('statusContent');
        const errorDiv = document.getElementById('statusError');

        this.showLoading(loadingDiv);
        this.hideContent(contentDiv);
        this.hideError(errorDiv);

        try {
            const response = await getAccountStatus();
            
            if (response.success && response.data) {
                const status = response.data;
                this.updateStatusDisplay(status);
                this.showContent(contentDiv);
            } else {
                throw new Error(response.message || 'Failed to load account status');
            }
        } catch (error) {
            console.error('Load account status error:', error);
            this.showError(errorDiv, error.message || 'Failed to load account status');
        } finally {
            this.hideLoading(loadingDiv);
        }
    }

    updateStatusDisplay(status) {
        const fields = {
            'statusUsername': status.username,
            'statusLocked': status.isLocked ? '<span class="status-locked">Locked</span>' : '<span class="status-enabled">Not Locked</span>',
            'statusSessionCreated': this.formatDate(status.sessionCreatedAt),
            'statusSessionExpires': this.formatDate(status.sessionExpiresAt),
            'statusLastActivity': this.formatDate(status.lastActivity)
        };

        Object.entries(fields).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.innerHTML = value || '-';
            }
        });
    }

    loadChangePasswordPage() {
        // Reset form and clear messages
        const form = document.getElementById('changePasswordForm');
        const errorDiv = document.getElementById('passwordError');
        const successDiv = document.getElementById('passwordSuccess');
        
        if (form) form.reset();
        if (errorDiv) this.hideError(errorDiv);
        if (successDiv) this.hideSuccess(successDiv);
    }

    async refreshProfile() {
        await this.loadProfile();
        this.showToast('Profile Refreshed', 'Profile information updated', 'SUCCESS');
    }

    async refreshAccountStatus() {
        await this.loadAccountStatus();
        this.showToast('Status Refreshed', 'Account status updated', 'SUCCESS');
    }

    async testADConnection() {
        try {
            const result = await apiTestADConnection();
            if (result.success) {
                this.showToast('Connection Test', 'AD connection successful', 'SUCCESS');
            } else {
                this.showToast('Connection Test', result.message || 'AD connection failed', 'ERROR');
            }
        } catch (error) {
            this.showToast('Connection Test', error.message || 'Failed to test AD connection', 'ERROR');
        }
    }

    renderDashboard(profile, status, sessionInfo) {
        // Render profile section
        if (profile && profile.data) {
            this.renderProfileSection(profile.data);
        }

        // Render account status section
        if (status && status.data) {
            this.renderAccountStatusSection(status.data);
        }

        // Render session section
        if (sessionInfo) {
            this.renderSessionSection(sessionInfo);
        }
    }

    renderProfileSection(profile) {
        const profileSection = document.getElementById('profileSection');
        if (!profileSection) return;

        profileSection.innerHTML = `
            <div class="row">
                <div class="col-6 mb-2">
                    <strong>Username:</strong><br>
                    <span class="text-muted">${profile.username || 'N/A'}</span>
                </div>
                <div class="col-6 mb-2">
                    <strong>Display Name:</strong><br>
                    <span class="text-muted">${profile.displayName || 'N/A'}</span>
                </div>
                <div class="col-6 mb-2">
                    <strong>Email:</strong><br>
                    <span class="text-muted">${profile.email || 'N/A'}</span>
                </div>
                <div class="col-6 mb-2">
                    <strong>Status:</strong><br>
                    <span class="${profile.isEnabled ? 'status-enabled' : 'status-disabled'}">
                        ${profile.isEnabled ? 'Enabled' : 'Disabled'}
                    </span>
                </div>
            </div>
        `;
    }

    renderAccountStatusSection(status) {
        const accountStatusSection = document.getElementById('accountStatusSection');
        if (!accountStatusSection) return;

        accountStatusSection.innerHTML = `
            <div class="row">
                <div class="col-6 mb-2">
                    <strong>Account Locked:</strong><br>
                    <span class="${status.isLocked ? 'status-locked' : 'status-enabled'}">
                        ${status.isLocked ? 'Yes' : 'No'}
                    </span>
                </div>
                <div class="col-6 mb-2">
                    <strong>Last Login:</strong><br>
                    <span class="text-muted">${this.formatDate(status.lastLogin)}</span>
                </div>
            </div>
        `;
    }

    renderSessionSection(sessionInfo) {
        const sessionSection = document.getElementById('sessionSection');
        if (!sessionSection) return;

        let minutesLeft = null;
        if (sessionInfo?.expiresIn) {
            minutesLeft = Math.ceil(sessionInfo.expiresIn / 60);
        } else if (sessionInfo?.expiresAt) {
            const expiresAt = new Date(sessionInfo.expiresAt);
            const ms = Math.max(0, expiresAt.getTime() - Date.now());
            minutesLeft = Math.ceil(ms / (1000 * 60));
        }

        sessionSection.innerHTML = `
            <div class="row">
                <div class="col-6 mb-2">
                    <strong>Session ID:</strong><br>
                    <span class="text-muted">${sessionInfo?.sessionId ? (sessionInfo.sessionId.substring(0, 8) + '...') : 'N/A'}</span>
                </div>
                <div class="col-6 mb-2">
                    <strong>Expires In:</strong><br>
                    <span class="${minutesLeft !== null && minutesLeft <= 5 ? 'text-danger fw-bold' : 'text-muted'}">
                        ${minutesLeft !== null ? minutesLeft + ' minutes' : 'Unknown'}
                    </span>
                </div>
            </div>
        `;
    }

    // Utility methods
    showLoading(element = null) {
        if (element) {
            element.classList.remove('d-none');
        } else {
            const loadingOverlay = document.getElementById('loadingOverlay');
            if (loadingOverlay) loadingOverlay.classList.remove('d-none');
        }
    }

    hideLoading(element = null) {
        if (element) {
            element.classList.add('d-none');
        } else {
            const loadingOverlay = document.getElementById('loadingOverlay');
            if (loadingOverlay) loadingOverlay.classList.add('d-none');
        }
    }

    showContent(element) {
        if (element) element.classList.remove('d-none');
    }

    hideContent(element) {
        if (element) element.classList.add('d-none');
    }

    showError(element, message) {
        if (element) {
            element.innerHTML = `<i class="fas fa-exclamation-circle me-2"></i>${message}`;
            element.classList.remove('d-none');
        }
    }

    hideError(element) {
        if (element) element.classList.add('d-none');
    }

    showSuccess(element, message) {
        if (element) {
            element.innerHTML = `<i class="fas fa-check-circle me-2"></i>${message}`;
            element.classList.remove('d-none');
        }
    }

    hideSuccess(element) {
        if (element) element.classList.add('d-none');
    }

    showToast(title, message, type = 'INFO') {
        if (!toastInstance) return;

        const toastIcon = document.getElementById('toastIcon');
        const toastTitle = document.getElementById('toastTitle');
        const toastBody = document.getElementById('toastBody');

        if (toastIcon && toastTitle && toastBody) {
            const toastType = TOAST_TYPES[type] || TOAST_TYPES.INFO;
            
            toastIcon.className = `fas ${toastType.icon} me-2`;
            toastTitle.textContent = title;
            toastBody.textContent = message;

            toastInstance.show();
        }
    }

    togglePasswordVisibility(inputId) {
        const input = document.getElementById(inputId);
        const button = input?.nextElementSibling;
        
        if (input && button) {
            const icon = button.querySelector('i');
            
            if (input.type === 'password') {
                input.type = 'text';
                icon.className = 'fas fa-eye-slash';
            } else {
                input.type = 'password';
                icon.className = 'fas fa-eye';
            }
        }
    }

    formatDate(dateString) {
        if (!dateString) return 'Never';
        try {
            return new Date(dateString).toLocaleString();
        } catch {
            return 'Invalid Date';
        }
    }
}

// Create and export app instance
const app = new App();
window.app = app;

// Export for module usage
export default app;