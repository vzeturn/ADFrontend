// Frontend/src/app.js

// Main application logic
class App {
    constructor() {
        this.currentPage = 'login';
        this.init();
    }

    async init() {
        // Load user from storage if exists
        auth.loadUserFromStorage();

        // Check existing session
        const hasValidSession = await this.checkSession();
        
        if (hasValidSession) {
            this.showDashboard();
        } else {
            this.showLogin();
        }

        this.setupEventListeners();
    }

    async checkSession() {
        const sessionId = api.getSessionId();
        if (!sessionId) return false;

        try {
            const isValid = await auth.validateSession();
            return isValid;
        } catch (error) {
            console.error('Session check failed:', error);
            return false;
        }
    }

    setupEventListeners() {
        // Login form
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', this.handleLogin.bind(this));
        }

        // Password toggle
        const togglePassword = document.getElementById('toggle-password');
        if (togglePassword) {
            togglePassword.addEventListener('click', () => {
                auth.togglePasswordVisibility('password', 'toggle-password');
            });
        }

        // Logout button
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', this.handleLogout.bind(this));
        }

        // Change password form
        const changePasswordForm = document.getElementById('change-password-form');
        if (changePasswordForm) {
            changePasswordForm.addEventListener('submit', this.handleChangePassword.bind(this));
        }
    }

    async handleLogin(event) {
        event.preventDefault();
        
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        const rememberMe = document.getElementById('remember-me').checked;
        
        const loginBtn = document.getElementById('login-btn');
        const loginSpinner = document.getElementById('login-spinner');
        const loginError = document.getElementById('login-error');

        // Clear previous errors
        loginError.classList.add('d-none');

        // Validate input
        if (!username || !password) {
            this.showError('login-error', 'Please enter both username and password');
            return;
        }

        // Show loading state
        loginBtn.disabled = true;
        loginSpinner.classList.remove('d-none');

        try {
            const response = await auth.login(username, password, rememberMe);
            
            if (response.success) {
                auth.showAlert('Login successful!', 'success');
                this.showDashboard();
            } else {
                this.showError('login-error', response.message || 'Login failed');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showError('login-error', error.message || 'Login failed. Please try again.');
        } finally {
            loginBtn.disabled = false;
            loginSpinner.classList.add('d-none');
        }
    }

    async handleLogout() {
        try {
            await auth.logout();
            auth.showAlert('Logged out successfully', 'info');
        } catch (error) {
            console.error('Logout error:', error);
            auth.showAlert('Logout completed', 'info');
        }
    }

    async handleChangePassword(event) {
        event.preventDefault();
        
        const currentPassword = document.getElementById('current-password').value;
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        
        const changeBtn = document.getElementById('change-password-btn');
        const spinner = document.getElementById('change-password-spinner');
        const errorDiv = document.getElementById('password-error');
        const successDiv = document.getElementById('password-success');

        // Clear previous messages
        errorDiv.classList.add('d-none');
        successDiv.classList.add('d-none');

        // Validate passwords
        if (newPassword !== confirmPassword) {
            this.showError('password-error', 'New passwords do not match');
            return;
        }

        if (newPassword.length < 8) {
            this.showError('password-error', 'New password must be at least 8 characters long');
            return;
        }

        // Show loading
        changeBtn.disabled = true;
        spinner.classList.remove('d-none');

        try {
            const response = await api.changePassword(currentPassword, newPassword, confirmPassword);
            
            if (response.success) {
                this.showSuccess('password-success', 'Password changed successfully! You will be logged out.');
                setTimeout(() => {
                    auth.logout();
                }, 2000);
            } else {
                this.showError('password-error', response.message || 'Failed to change password');
            }
        } catch (error) {
            console.error('Change password error:', error);
            this.showError('password-error', error.message || 'Failed to change password');
        } finally {
            changeBtn.disabled = false;
            spinner.classList.add('d-none');
        }
    }

    showLogin() {
        this.currentPage = 'login';
        this.hideAllPages();
        document.getElementById('login-page').classList.remove('d-none');
        document.getElementById('navbar').classList.add('d-none');
    }

    showDashboard() {
        this.currentPage = 'dashboard';
        this.hideAllPages();
        document.getElementById('dashboard-page').classList.remove('d-none');
        document.getElementById('navbar').classList.remove('d-none');
        this.updateUserInfo();
    }

    hideAllPages() {
        const pages = ['login-page', 'dashboard-page', 'profile-page', 'change-password-page', 'account-status-page'];
        pages.forEach(pageId => {
            const page = document.getElementById(pageId);
            if (page) page.classList.add('d-none');
        });
    }

    updateUserInfo() {
        const user = auth.getCurrentUser();
        if (user) {
            const userInfoSpan = document.getElementById('user-info');
            if (userInfoSpan) {
                userInfoSpan.textContent = `Welcome, ${user.displayName || user.username}`;
            }
        }
    }

    async loadProfile() {
        const loadingDiv = document.getElementById('profile-loading');
        const contentDiv = document.getElementById('profile-content');
        const errorDiv = document.getElementById('profile-error');

        loadingDiv.classList.remove('d-none');
        contentDiv.classList.add('d-none');
        errorDiv.classList.add('d-none');

        try {
            const response = await api.getUserProfile();
            
            if (response.success && response.data) {
                const user = response.data;
                document.getElementById('profile-username').textContent = user.username || '-';
                document.getElementById('profile-displayname').textContent = user.displayName || '-';
                document.getElementById('profile-firstname').textContent = user.firstName || '-';
                document.getElementById('profile-lastname').textContent = user.lastName || '-';
                document.getElementById('profile-email').textContent = user.email || '-';
                document.getElementById('profile-status').innerHTML = user.isEnabled 
                    ? '<span class="status-enabled">Enabled</span>' 
                    : '<span class="status-disabled">Disabled</span>';
                document.getElementById('profile-lastlogin').textContent = auth.formatDate(user.lastLogin);
                document.getElementById('profile-passwordset').textContent = auth.formatDate(user.passwordLastSet);

                loadingDiv.classList.add('d-none');
                contentDiv.classList.remove('d-none');
            } else {
                throw new Error(response.message || 'Failed to load profile');
            }
        } catch (error) {
            console.error('Load profile error:', error);
            loadingDiv.classList.add('d-none');
            this.showError('profile-error', error.message || 'Failed to load profile');
        }
    }

    async loadAccountStatus() {
        const loadingDiv = document.getElementById('status-loading');
        const contentDiv = document.getElementById('status-content');
        const errorDiv = document.getElementById('status-error');

        loadingDiv.classList.remove('d-none');
        contentDiv.classList.add('d-none');
        errorDiv.classList.add('d-none');

        try {
            const response = await api.getAccountStatus();
            
            if (response.success && response.data) {
                const status = response.data;
                document.getElementById('status-username').textContent = status.username || '-';
                document.getElementById('status-locked').innerHTML = status.isLocked 
                    ? '<span class="status-locked">Locked</span>' 
                    : '<span class="status-enabled">Not Locked</span>';
                document.getElementById('status-session-created').textContent = auth.formatDate(status.sessionCreatedAt);
                document.getElementById('status-session-expires').textContent = auth.formatDate(status.sessionExpiresAt);
                document.getElementById('status-last-activity').textContent = auth.formatDate(status.lastActivity);

                loa