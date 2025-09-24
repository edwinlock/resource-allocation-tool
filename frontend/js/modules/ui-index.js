import { sessionManager } from './session-coordinator.js';
import { SessionRenderer } from './session-renderer.js';
import { SessionUIUtils } from './shared-utils.js';
import { apiService } from './api-service.js';

console.log('UI-Index loaded, apiService:', apiService);
console.log('apiService methods:', Object.getOwnPropertyNames(apiService));

// UI Management for index.html page
class IndexUIManager {
    constructor() {
        this.bindEvents();
    }

    bindEvents() {
        document.addEventListener('DOMContentLoaded', () => {
            this.setupFormHandlers();
            this.loadAndRenderSessions();
        });
    }

    async loadAndRenderSessions() {
        try {
            const allSessions = await sessionManager.loadSessions();

            // Only show sessions if user is logged in
            const isAuthenticated = apiService && typeof apiService.isAuthenticated === 'function' ? apiService.isAuthenticated() : false;
            const currentEnumeratorId = apiService && apiService.enumeratorId ? apiService.enumeratorId : null;

            const filteredSessions = isAuthenticated && currentEnumeratorId
                ? allSessions.filter(session => session.enumeratorID === currentEnumeratorId)
                : []; // Show nothing when logged out

            // Separate current and uploaded sessions
            const currentSessions = filteredSessions.filter(session => session.uploadStatus !== 'uploaded');
            const uploadedSessions = filteredSessions.filter(session => session.uploadStatus === 'uploaded');

            // Render both tables
            await SessionRenderer.renderCurrentSessions(currentSessions);
            await SessionRenderer.renderUploadedSessions(uploadedSessions);

            // Update counts in header (show filtered counts)
            this.updateSessionCounts(currentSessions.length, uploadedSessions.length, filteredSessions.length);

            // Update table badges
            this.updateTableBadges(currentSessions.length, uploadedSessions.length);

            // Update upload button state
            await this.updateUploadButtonState();

            // Update login status notification
            this.updateLoginStatusNotification();

        } catch (error) {
            console.error('Error loading sessions:', error);
            SessionUIUtils.showError(`Failed to load sessions: ${error.message}`);
        }
    }

    updateSessionCounts(currentCount, uploadedCount, totalCount) {
        SessionUIUtils.updateElementText('currentSessionCount', currentCount);
        SessionUIUtils.updateElementText('uploadedSessionCount', uploadedCount);
        SessionUIUtils.updateElementText('totalSessionCount', totalCount);
    }

    updateTableBadges(currentCount, uploadedCount) {
        const currentBadge = document.getElementById('currentSessionsBadge');
        if (currentBadge) {
            currentBadge.textContent = `${currentCount} session${currentCount !== 1 ? 's' : ''}`;
        }

        const uploadedBadge = document.getElementById('uploadedSessionsBadge');
        if (uploadedBadge) {
            uploadedBadge.textContent = `${uploadedCount} uploaded`;
        }
    }

    async updateUploadButtonState() {
        const uploadBtn = document.getElementById('uploadCompletedBtn');
        if (!uploadBtn) return;

        try {
            const uploadableSessions = await sessionManager.getUploadableSessions();
            const count = uploadableSessions.length;
            const isAuthenticated = apiService && typeof apiService.isAuthenticated === 'function' ? apiService.isAuthenticated() : false;

            if (!isAuthenticated) {
                uploadBtn.disabled = true;
                uploadBtn.textContent = 'Upload Completed Sessions';
                uploadBtn.className = 'btn btn-outline-secondary ms-2';
            } else if (count === 0) {
                uploadBtn.disabled = true;
                uploadBtn.textContent = 'Upload Completed Sessions';
                uploadBtn.className = 'btn btn-outline-secondary ms-2';
            } else {
                uploadBtn.disabled = false;
                uploadBtn.textContent = `Upload ${count} Completed Session${count !== 1 ? 's' : ''}`;
                uploadBtn.className = 'btn btn-success ms-2';
            }
        } catch (error) {
            console.error('Error updating upload button state:', error);
        }
    }

    setupFormHandlers() {
        // Create session button
        const createSessionBtn = document.getElementById('createSessionBtn');
        if (createSessionBtn) {
            createSessionBtn.addEventListener('click', () => {
                // Clear any previous modal errors when opening
                SessionUIUtils.hideModalError();
                const modal = new bootstrap.Modal(document.getElementById('createSessionModal'));
                modal.show();
            });
        }

        // Save session button
        const saveSessionBtn = document.getElementById('saveSessionBtn');
        if (saveSessionBtn) {
            saveSessionBtn.addEventListener('click', () => {
                this.handleCreateSession();
            });
        }

        // Upload completed sessions button
        const uploadCompletedBtn = document.getElementById('uploadCompletedBtn');
        if (uploadCompletedBtn) {
            uploadCompletedBtn.addEventListener('click', () => {
                this.handleBulkUpload();
            });
        }

        // Login/Logout button in header
        const loginLogoutBtn = document.getElementById('loginLogoutBtn');
        if (loginLogoutBtn) {
            loginLogoutBtn.addEventListener('click', () => {
                const isAuthenticated = apiService && typeof apiService.isAuthenticated === 'function' ? apiService.isAuthenticated() : false;

                if (isAuthenticated) {
                    this.handleLogout();
                } else {
                    console.log('Login button clicked'); // Debug log
                    this.showLoginModal();
                }
            });
        }

        // Login modal handlers
        const loginSubmitBtn = document.getElementById('loginSubmitBtn');
        if (loginSubmitBtn) {
            loginSubmitBtn.addEventListener('click', () => {
                this.handleLogin();
            });
        }

        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.handleLogout();
            });
        }



        const togglePassword = document.getElementById('togglePassword');
        if (togglePassword) {
            togglePassword.addEventListener('click', () => {
                this.togglePasswordVisibility();
            });
        }

        // Reset DB button
        const resetDbBtn = document.getElementById('resetDbBtn');
        if (resetDbBtn) {
            resetDbBtn.addEventListener('click', () => {
                const modal = new bootstrap.Modal(document.getElementById('resetDbModal'));
                modal.show();
            });
        }

        // Confirm reset button
        const confirmResetBtn = document.getElementById('confirmResetBtn');
        if (confirmResetBtn) {
            confirmResetBtn.addEventListener('click', () => {
                this.handleResetDatabase();
            });
        }

        // Event delegation for session action buttons
        document.addEventListener('click', (event) => {
            if (event.target.classList.contains('session-action')) {
                // Prevent action on disabled buttons
                if (event.target.disabled || event.target.hasAttribute('disabled')) {
                    return;
                }

                const action = event.target.dataset.action;
                const sessionId = event.target.dataset.sessionId;

                if (action && sessionId) {
                    switch (action) {
                        case 'viewSessionDetails':
                            this.viewSessionDetails(sessionId);
                            break;
                        case 'startChild1Survey':
                            this.startChild1Survey(sessionId);
                            break;
                        case 'startChild2Survey':
                            this.startChild2Survey(sessionId);
                            break;
                        case 'startTreatmentSurvey':
                            this.startTreatmentSurvey(sessionId);
                            break;
                        case 'startControlSurvey':
                            this.startControlSurvey(sessionId);
                            break;
                        case 'startSlider':
                            this.startSlider(sessionId);
                            break;
                        case 'deleteSession':
                            this.deleteSession(sessionId);
                            break;
                    }
                }
            }
        });

        // Clear modal errors when modal is closed
        const createSessionModal = document.getElementById('createSessionModal');
        if (createSessionModal) {
            createSessionModal.addEventListener('hidden.bs.modal', () => {
                SessionUIUtils.hideModalError();
                document.getElementById('createSessionForm').reset();
            });
        }

        // Clear login modal errors when modal is closed
        const loginModal = document.getElementById('loginModal');
        if (loginModal) {
            loginModal.addEventListener('hidden.bs.modal', () => {
                this.hideLoginModalError();
                const loginForm = document.getElementById('loginForm');
                if (loginForm) {
                    loginForm.reset();
                }
            });
        }
    }

    async handleCreateSession() {
        const participantId = document.getElementById('participantId').value.trim();
        const enumeratorId = document.getElementById('enumeratorId').value.trim();
        const child1Name = document.getElementById('child1Name').value.trim();
        const child2Name = document.getElementById('child2Name').value.trim();
        const school = document.getElementById('school').value.trim();
        const child1Ability = parseInt(document.getElementById('child1Ability').value);
        const child2Ability = parseInt(document.getElementById('child2Ability').value);
        const sessionType = document.querySelector('input[name="sessionType"]:checked')?.value;


        // Clear any previous modal errors
        SessionUIUtils.hideModalError();

        if (!participantId || !enumeratorId || !child1Name || !child2Name || !school || !sessionType) {
            SessionUIUtils.showModalError('Please fill in all fields');
            return;
        }

        // Validate child abilities
        if (isNaN(child1Ability) || child1Ability < 0 || child1Ability > 100) {
            SessionUIUtils.showModalError('Child 1 ability must be a number between 0 and 100');
            return;
        }

        if (isNaN(child2Ability) || child2Ability < 0 || child2Ability > 100) {
            SessionUIUtils.showModalError('Child 2 ability must be a number between 0 and 100');
            return;
        }

        try {
            await sessionManager.createSession(participantId, enumeratorId, child1Ability, child2Ability, child1Name, child2Name, school, sessionType);
            await this.loadAndRenderSessions();
            SessionUIUtils.showSuccess('Session created successfully');

            // Close modal and reset form
            const modal = bootstrap.Modal.getInstance(document.getElementById('createSessionModal'));
            if (modal) {
                modal.hide();
                document.getElementById('createSessionForm').reset();
                SessionUIUtils.hideModalError();
            }
        } catch (error) {
            console.error('Error creating session:', error);
            SessionUIUtils.showModalError(error.message);
        }
    }

    async handleBulkUpload() {
        try {
            // Disable the button during upload
            const uploadBtn = document.getElementById('uploadCompletedBtn');
            if (uploadBtn) {
                uploadBtn.disabled = true;
                uploadBtn.textContent = 'Uploading...';
            }

            // Get all completed sessions that haven't been uploaded
            const uploadableSessions = await sessionManager.getUploadableSessions();

            if (uploadableSessions.length === 0) {
                SessionUIUtils.showSuccess('No completed sessions available for upload');
                return;
            }

            let successCount = 0;
            let failureCount = 0;
            const errors = [];

            // Upload each session one by one
            for (const session of uploadableSessions) {
                try {
                    await sessionManager.uploadSession(session.id);
                    successCount++;
                    console.log(`Successfully uploaded session ${session.id}`);
                } catch (error) {
                    failureCount++;
                    errors.push(`Session ${session.id}: ${error.message}`);
                    console.error(`Failed to upload session ${session.id}:`, error);
                }
            }

            // Show results
            if (failureCount === 0) {
                SessionUIUtils.showSuccess(`Successfully uploaded ${successCount} session${successCount !== 1 ? 's' : ''}`);
            } else if (successCount === 0) {
                SessionUIUtils.showError(`Failed to upload all sessions. Errors: ${errors.join('; ')}`);
            } else {
                SessionUIUtils.showError(`Uploaded ${successCount} session${successCount !== 1 ? 's' : ''}, but ${failureCount} failed. Errors: ${errors.join('; ')}`);
            }

            // Refresh the session list to show updated upload status
            await this.loadAndRenderSessions();

        } catch (error) {
            console.error('Error during bulk upload:', error);
            SessionUIUtils.showError(`Bulk upload failed: ${error.message}`);
        } finally {
            // Re-enable the button
            const uploadBtn = document.getElementById('uploadCompletedBtn');
            if (uploadBtn) {
                uploadBtn.disabled = false;
                uploadBtn.textContent = 'Upload Completed Sessions';
            }
        }
    }

    async handleResetDatabase() {
        try {
            await sessionManager.resetDatabase();
            await this.loadAndRenderSessions();
            SessionUIUtils.showSuccess('Database reset successfully');

            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('resetDbModal'));
            if (modal) {
                modal.hide();
            }
        } catch (error) {
            console.error('Error resetting database:', error);
            SessionUIUtils.showError('Failed to reset database');
        }
    }

    updateLoginStatusNotification() {
        const notification = document.getElementById('loginStatusNotification');
        const userDisplay = document.getElementById('currentUserDisplay');
        const enumeratorIdDisplay = document.getElementById('currentEnumeratorId');
        const loginLogoutBtn = document.getElementById('loginLogoutBtn');

        const isAuthenticated = apiService && typeof apiService.isAuthenticated === 'function' ? apiService.isAuthenticated() : false;

        if (isAuthenticated && (apiService.enumeratorName || apiService.username)) {
            // Show notification
            if (userDisplay) userDisplay.textContent = apiService.enumeratorName || apiService.username;
            if (enumeratorIdDisplay) enumeratorIdDisplay.textContent = apiService.enumeratorId || '1';
            if (notification) notification.style.display = 'block';

            // Update header button to show "Logout"
            if (loginLogoutBtn) {
                loginLogoutBtn.textContent = '🚪 Logout';
                loginLogoutBtn.className = 'btn btn-outline-danger';
            }
        } else {
            // Hide notification
            if (notification) notification.style.display = 'none';

            // Update header button to show "Login"
            if (loginLogoutBtn) {
                loginLogoutBtn.textContent = '🔑 Login';
                loginLogoutBtn.className = 'btn btn-outline-secondary';
            }
        }
    }

    // Action button handlers for onclick events
    async startChild1Survey(sessionId) {
        try {
            await sessionManager.markSurveyStarted(sessionId);
            window.location.href = `survey.html?survey_id=Child1&session_id=${sessionId}`;
        } catch (error) {
            console.error('Error starting child 1 survey:', error);
            SessionUIUtils.showError('Failed to start child 1 survey');
        }
    }

    async startChild2Survey(sessionId) {
        try {
            await sessionManager.markSurveyStarted(sessionId);
            window.location.href = `survey.html?survey_id=Child2&session_id=${sessionId}`;
        } catch (error) {
            console.error('Error starting child 2 survey:', error);
            SessionUIUtils.showError('Failed to start child 2 survey');
        }
    }

    async startTreatmentSurvey(sessionId) {
        try {
            await sessionManager.markSurveyStarted(sessionId);
            window.location.href = `survey.html?survey_id=Treatment&session_id=${sessionId}`;
        } catch (error) {
            console.error('Error starting treatment survey:', error);
            SessionUIUtils.showError('Failed to start treatment survey');
        }
    }

    async startControlSurvey(sessionId) {
        try {
            await sessionManager.markSurveyStarted(sessionId);
            window.location.href = `survey.html?survey_id=Control&session_id=${sessionId}`;
        } catch (error) {
            console.error('Error starting control survey:', error);
            SessionUIUtils.showError('Failed to start control survey');
        }
    }

    async startSlider(sessionId) {
        try {
            await sessionManager.markSliderStarted(sessionId);
            window.location.href = `slider.html?sessionId=${sessionId}`;
        } catch (error) {
            console.error('Error starting slider:', error);
            SessionUIUtils.showError('Failed to start slider');
        }
    }

    viewSessionDetails(sessionId) {
        window.location.href = `sessiondetail.html?sessionId=${sessionId}`;
    }

    async deleteSession(sessionId) {
        if (confirm('Are you sure you want to delete this session? This action cannot be undone.')) {
            try {
                await sessionManager.deleteSession(sessionId);
                await this.loadAndRenderSessions();
                SessionUIUtils.showSuccess('Session deleted successfully');
            } catch (error) {
                console.error('Error deleting session:', error);
                SessionUIUtils.showError('Failed to delete session');
            }
        }
    }

    // Login and Authentication handlers
    showLoginModal() {
        console.log('showLoginModal called'); // Debug log

        // Get form elements
        const loginUsername = document.getElementById('loginUsername');
        const loginStatus = document.getElementById('loginStatus');
        const currentUser = document.getElementById('currentUser');

        // Clear form fields
        if (loginUsername) loginUsername.value = '';
        const loginPassword = document.getElementById('loginPassword');
        if (loginPassword) loginPassword.value = '';

        // Show current login status
        const isAuth = apiService && typeof apiService.isAuthenticated === 'function' ? apiService.isAuthenticated() : false;

        if (isAuth && apiService.username) {
            if (loginStatus) loginStatus.style.display = 'block';
            if (currentUser) currentUser.textContent = apiService.username;
        } else {
            if (loginStatus) loginStatus.style.display = 'none';
        }

        // Clear any previous errors
        this.hideLoginModalError();

        // Show modal
        const loginModalElement = document.getElementById('loginModal');

        if (loginModalElement) {
            const modal = new bootstrap.Modal(loginModalElement);
            modal.show();
        } else {
            console.error('Login modal element not found!');
        }
    }

    async handleLogin() {
        const username = document.getElementById('loginUsername').value.trim();
        const password = document.getElementById('loginPassword').value;
        const rememberMe = document.getElementById('rememberMe').checked;

        // Clear any previous errors
        this.hideLoginModalError();

        if (!username || !password) {
            this.showLoginModalError('Please fill in username and password');
            return;
        }

        try {
            // API URL is configured in constants.js, no need to set it here

            // Disable submit button during login
            const submitBtn = document.getElementById('loginSubmitBtn');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Logging in...';
            }

            // Attempt login
            const result = await apiService.login(username, password, rememberMe);

            if (result.success) {
                // Close modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
                if (modal) {
                    modal.hide();
                }

                SessionUIUtils.showSuccess(`Successfully logged in as ${username}`);

                // Update upload button state and login notification
                await this.updateUploadButtonState();
                this.updateLoginStatusNotification();
            } else {
                this.showLoginModalError('Login failed - please check your credentials');
            }

        } catch (error) {
            if (error.name === 'TypeError' && error.message.includes('URL')) {
                this.showLoginModalError('Please enter a valid URL format (e.g., https://api.example.com)');
            } else {
                this.showLoginModalError(`Login failed: ${error.message}`);
            }
        } finally {
            // Re-enable submit button
            const submitBtn = document.getElementById('loginSubmitBtn');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Login';
            }
        }
    }

    handleLogout() {
        if (confirm('Are you sure you want to logout?')) {
            apiService.clearCredentials();

            // Update login status display
            const loginStatus = document.getElementById('loginStatus');
            if (loginStatus) loginStatus.style.display = 'none';

            SessionUIUtils.showSuccess('Successfully logged out');

            // Update upload button state and login notification
            this.updateUploadButtonState();
            this.updateLoginStatusNotification();

            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
            if (modal) {
                modal.hide();
            }
        }
    }


    togglePasswordVisibility() {
        const passwordInput = document.getElementById('loginPassword');
        const toggleBtn = document.getElementById('togglePassword');

        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            toggleBtn.textContent = '🙈';
        } else {
            passwordInput.type = 'password';
            toggleBtn.textContent = '👁️';
        }
    }

    showLoginModalError(message) {
        const errorDisplay = document.getElementById('loginModalErrorDisplay');
        const errorMessage = document.getElementById('loginModalErrorMessage');
        if (errorDisplay && errorMessage) {
            errorMessage.textContent = message;
            errorDisplay.style.display = 'block';
        }
    }

    hideLoginModalError() {
        const errorDisplay = document.getElementById('loginModalErrorDisplay');
        if (errorDisplay) {
            errorDisplay.style.display = 'none';
        }
    }

}

// Initialize the index UI manager
const indexUI = new IndexUIManager();

// Export indexUI for module access
export { indexUI };