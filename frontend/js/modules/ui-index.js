import { sessionManager } from './session-coordinator.js';
import { SessionRenderer } from './session-renderer.js';
import { SessionUIUtils } from './shared-utils.js';
import { apiService } from './api-service.js';

class IndexUIManager {
    constructor() {
        this.bindEvents();
    }

    bindEvents() {
        document.addEventListener('DOMContentLoaded', () => {
            this.setupFormHandlers();
            this.loadAndRenderSessions();
            this.updateUIBasedOnAuthStatus();
        });
    }

    async loadAndRenderSessions() {
        try {
            const allSessions = await sessionManager.loadSessions();

            // Separate current and uploaded sessions (no filtering by enumerator)
            const currentSessions = allSessions.filter(session => session.uploadStatus !== 'uploaded');
            const uploadedSessions = allSessions.filter(session => session.uploadStatus === 'uploaded');

            // Render both tables
            await SessionRenderer.renderCurrentSessions(currentSessions);
            await SessionRenderer.renderUploadedSessions(uploadedSessions);

            // Update counts in header
            this.updateSessionCounts(currentSessions.length, uploadedSessions.length, allSessions.length);

            // Update table badges
            this.updateTableBadges(currentSessions.length, uploadedSessions.length);

            // Update upload button state
            await this.updateUploadButtonState();

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
            const isAuthenticated = apiService.isAuthenticated();

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

    updateUIBasedOnAuthStatus() {
        const isAuthenticated = apiService.isAuthenticated();
        const loginBtn = document.getElementById('loginBtn');
        const loginStatus = document.getElementById('loginStatus');
        const loggedInUser = document.getElementById('loggedInUser');
        const loggedInUserId = document.getElementById('loggedInUserId');

        if (isAuthenticated) {
            // Hide login button
            if (loginBtn) {
                loginBtn.style.display = 'none';
            }

            // Show login status
            if (loginStatus) {
                loginStatus.style.display = 'block';
            }
            if (loggedInUser) {
                loggedInUser.textContent = apiService.email;
            }
            if (loggedInUserId) {
                loggedInUserId.textContent = apiService.userId;
            }

            // Auto-populate enumerator ID in create session modal
            this.autoPopulateEnumeratorId();
        } else {
            // Show login button
            if (loginBtn) {
                loginBtn.style.display = 'block';
            }

            // Hide login status
            if (loginStatus) {
                loginStatus.style.display = 'none';
            }

            // Clear enumerator ID
            this.clearEnumeratorId();
        }
    }

    autoPopulateEnumeratorId() {
        const enumeratorIdField = document.getElementById('enumeratorId');
        if (enumeratorIdField && apiService.userId) {
            enumeratorIdField.value = apiService.userId;
        }
    }

    clearEnumeratorId() {
        const enumeratorIdField = document.getElementById('enumeratorId');
        if (enumeratorIdField) {
            enumeratorIdField.value = '';
        }
    }

    setupFormHandlers() {
        // Login button
        const loginBtn = document.getElementById('loginBtn');
        if (loginBtn) {
            loginBtn.addEventListener('click', () => {
                this.showLoginModal();
            });
        }

        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.handleLogout();
            });
        }

        // Login submit button
        const loginSubmit = document.getElementById('loginSubmit');
        if (loginSubmit) {
            loginSubmit.addEventListener('click', () => {
                this.handleLogin();
            });
        }

        // Create session button
        const createSessionBtn = document.getElementById('createSessionBtn');
        if (createSessionBtn) {
            createSessionBtn.addEventListener('click', () => {
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
                        case 'startParentSurvey':
                            this.startParentSurvey(sessionId);
                            break;
                        case 'deleteSession':
                            this.deleteSession(sessionId);
                            break;
                    }
                }
            }
        });

        // Clear modal errors when modals are closed
        const createSessionModal = document.getElementById('createSessionModal');
        if (createSessionModal) {
            createSessionModal.addEventListener('hidden.bs.modal', () => {
                SessionUIUtils.hideModalError();
                document.getElementById('createSessionForm').reset();
            });
        }

        const loginModal = document.getElementById('loginModal');
        if (loginModal) {
            loginModal.addEventListener('hidden.bs.modal', () => {
                this.clearLoginError();
                document.getElementById('loginForm').reset();
            });
        }
    }

    showLoginModal() {
        const loginModal = document.getElementById('loginModal');
        if (loginModal) {
            const modal = new bootstrap.Modal(loginModal);
            modal.show();
        }
    }

    async handleLogin() {
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        this.clearLoginError();

        if (!email || !password) {
            this.showLoginError('Please enter both email and password');
            return;
        }

        const loginSubmit = document.getElementById('loginSubmit');
        if (loginSubmit) {
            loginSubmit.disabled = true;
            loginSubmit.textContent = 'Logging in...';
        }

        try {
            const result = await apiService.login(email, password);

            if (result.success) {
                // Close modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
                if (modal) {
                    modal.hide();
                }

                SessionUIUtils.showSuccess(`Successfully logged in as ${email}`);
                this.updateUIBasedOnAuthStatus();
                await this.loadAndRenderSessions();
            } else {
                this.showLoginError('Login failed');
            }
        } catch (error) {
            this.showLoginError(error.message);
        } finally {
            if (loginSubmit) {
                loginSubmit.disabled = false;
                loginSubmit.textContent = 'Login';
            }
        }
    }

    handleLogout() {
        if (confirm('Are you sure you want to logout?')) {
            apiService.clearCredentials();
            SessionUIUtils.showSuccess('Successfully logged out');
            this.updateUIBasedOnAuthStatus();
            this.loadAndRenderSessions();
        }
    }

    showLoginError(message) {
        const loginError = document.getElementById('loginError');
        if (loginError) {
            loginError.textContent = message;
            loginError.style.display = 'block';
        }
    }

    clearLoginError() {
        const loginError = document.getElementById('loginError');
        if (loginError) {
            loginError.style.display = 'none';
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

        SessionUIUtils.hideModalError();

        if (!participantId || !enumeratorId || !child1Name || !child2Name || !school || !sessionType) {
            SessionUIUtils.showModalError('Please fill in all fields');
            return;
        }

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
            const uploadBtn = document.getElementById('uploadCompletedBtn');
            if (uploadBtn) {
                uploadBtn.disabled = true;
                uploadBtn.textContent = 'Uploading...';
            }

            const uploadableSessions = await sessionManager.getUploadableSessions();

            if (uploadableSessions.length === 0) {
                SessionUIUtils.showSuccess('No completed sessions available for upload');
                return;
            }

            let successCount = 0;
            let failureCount = 0;
            const errors = [];

            for (const session of uploadableSessions) {
                try {
                    await sessionManager.uploadSession(session.id);
                    successCount++;
                } catch (error) {
                    failureCount++;
                    errors.push(`Session ${session.id}: ${error.message}`);
                }
            }

            if (failureCount === 0) {
                SessionUIUtils.showSuccess(`Successfully uploaded ${successCount} session${successCount !== 1 ? 's' : ''}`);
            } else if (successCount === 0) {
                SessionUIUtils.showError(`Failed to upload all sessions. Errors: ${errors.join('; ')}`);
            } else {
                SessionUIUtils.showError(`Uploaded ${successCount} session${successCount !== 1 ? 's' : ''}, but ${failureCount} failed. Errors: ${errors.join('; ')}`);
            }

            await this.loadAndRenderSessions();

        } catch (error) {
            console.error('Error during bulk upload:', error);
            SessionUIUtils.showError(`Bulk upload failed: ${error.message}`);
        } finally {
            const uploadBtn = document.getElementById('uploadCompletedBtn');
            if (uploadBtn) {
                uploadBtn.disabled = false;
                await this.updateUploadButtonState();
            }
        }
    }

    async handleResetDatabase() {
        try {
            await sessionManager.resetDatabase();
            await this.loadAndRenderSessions();
            SessionUIUtils.showSuccess('Database reset successfully');

            const modal = bootstrap.Modal.getInstance(document.getElementById('resetDbModal'));
            if (modal) {
                modal.hide();
            }
        } catch (error) {
            console.error('Error resetting database:', error);
            SessionUIUtils.showError('Failed to reset database');
        }
    }

    // Session action handlers
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

    async startParentSurvey(sessionId) {
        try {
            // Get session to determine type
            const session = await sessionManager.getSession(sessionId);
            if (!session) {
                throw new Error('Session not found');
            }

            await sessionManager.markSurveyStarted(sessionId);

            // Route to appropriate survey based on session type
            const surveyId = session.sessionType === 'treatment' ? 'Treatment' : 'Control';
            window.location.href = `survey.html?survey_id=${surveyId}&session_id=${sessionId}`;
        } catch (error) {
            console.error('Error starting parent survey:', error);
            SessionUIUtils.showError('Failed to start parent survey');
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
}

// Initialize the index UI manager
const indexUI = new IndexUIManager();

export { indexUI };