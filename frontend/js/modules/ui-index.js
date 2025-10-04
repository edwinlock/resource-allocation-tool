import { sessionManager } from './session-coordinator.js';
import { SessionRenderer } from './session-renderer.js';
import { SessionUIUtils } from './shared-utils.js';
import { apiService } from './api-service.js';

class IndexUIManager {
    constructor() {
        this.schools = [];  // Schools loaded from schools.json
        this.bindEvents();
    }

    bindEvents() {
        document.addEventListener('DOMContentLoaded', () => {
            this.loadSchools();
            this.setupFormHandlers();
            this.loadAndRenderSessions();
            this.updateUIBasedOnAuthStatus();
        });
    }

    async loadSchools() {
        try {
            const response = await fetch('schools.json');
            if (!response.ok) {
                throw new Error('Failed to load schools.json');
            }
            this.schools = await response.json();
            this.populateSchoolDropdowns();
        } catch (error) {
            console.error('Error loading schools:', error);
            SessionUIUtils.showError('Failed to load schools list');
        }
    }

    populateSchoolDropdowns() {
        const childSchoolSelect = document.getElementById('childSchool');
        const parentSchoolSelect = document.getElementById('parentSchool');

        const options = this.schools.map(school =>
            `<option value="${school.school_id}" data-type="${school.type}">${school.name}</option>`
        ).join('');

        if (childSchoolSelect) {
            childSchoolSelect.innerHTML = '<option value="">Select a school...</option>' + options;
        }
        if (parentSchoolSelect) {
            parentSchoolSelect.innerHTML = '<option value="">Select a school...</option>' + options;
        }
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

        // Create child session button
        const createChildSessionBtn = document.getElementById('createChildSessionBtn');
        if (createChildSessionBtn) {
            createChildSessionBtn.addEventListener('click', () => {
                this.hideChildModalError();
                const childEnumeratorIdField = document.getElementById('childEnumeratorId');
                // Auto-populate and disable enumerator ID if logged in
                if (apiService.isAuthenticated() && apiService.userId) {
                    childEnumeratorIdField.value = apiService.userId;
                    childEnumeratorIdField.disabled = true;
                } else {
                    childEnumeratorIdField.value = '';
                    childEnumeratorIdField.disabled = false;
                }
                const modal = new bootstrap.Modal(document.getElementById('createChildSessionModal'));
                modal.show();
            });
        }

        // Create parent session button
        const createParentSessionBtn = document.getElementById('createParentSessionBtn');
        if (createParentSessionBtn) {
            createParentSessionBtn.addEventListener('click', () => {
                this.hideParentModalError();
                const parentEnumeratorIdField = document.getElementById('parentEnumeratorId');
                // Auto-populate and disable enumerator ID if logged in
                if (apiService.isAuthenticated() && apiService.userId) {
                    parentEnumeratorIdField.value = apiService.userId;
                    parentEnumeratorIdField.disabled = true;
                } else {
                    parentEnumeratorIdField.value = '';
                    parentEnumeratorIdField.disabled = false;
                }
                const modal = new bootstrap.Modal(document.getElementById('createParentSessionModal'));
                modal.show();
            });
        }

        // Save child session button
        const saveChildSessionBtn = document.getElementById('saveChildSessionBtn');
        if (saveChildSessionBtn) {
            saveChildSessionBtn.addEventListener('click', () => {
                this.handleCreateChildSession();
            });
        }

        // Save parent session button
        const saveParentSessionBtn = document.getElementById('saveParentSessionBtn');
        if (saveParentSessionBtn) {
            saveParentSessionBtn.addEventListener('click', () => {
                this.handleCreateParentSession();
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
                        case 'startChildSurvey':
                            this.startChildSurvey(sessionId);
                            break;
                        case 'startParentSession':
                            this.startParentSession(sessionId);
                            break;
                        case 'deleteSession':
                            this.deleteSession(sessionId);
                            break;
                    }
                }
            }
        });

        // Clear modal errors when modals are closed
        const createChildSessionModal = document.getElementById('createChildSessionModal');
        if (createChildSessionModal) {
            createChildSessionModal.addEventListener('hidden.bs.modal', () => {
                this.hideChildModalError();
                document.getElementById('createChildSessionForm').reset();
            });
        }

        const createParentSessionModal = document.getElementById('createParentSessionModal');
        if (createParentSessionModal) {
            createParentSessionModal.addEventListener('hidden.bs.modal', () => {
                this.hideParentModalError();
                document.getElementById('createParentSessionForm').reset();
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

    // Modal error display helpers
    showChildModalError(message) {
        const errorDisplay = document.getElementById('childModalErrorDisplay');
        const errorMessage = document.getElementById('childModalErrorMessage');
        if (errorDisplay && errorMessage) {
            errorMessage.textContent = message;
            errorDisplay.style.display = 'block';
        }
    }

    hideChildModalError() {
        const errorDisplay = document.getElementById('childModalErrorDisplay');
        if (errorDisplay) {
            errorDisplay.style.display = 'none';
        }
    }

    showParentModalError(message) {
        const errorDisplay = document.getElementById('parentModalErrorDisplay');
        const errorMessage = document.getElementById('parentModalErrorMessage');
        if (errorDisplay && errorMessage) {
            errorMessage.textContent = message;
            errorDisplay.style.display = 'block';
        }
    }

    hideParentModalError() {
        const errorDisplay = document.getElementById('parentModalErrorDisplay');
        if (errorDisplay) {
            errorDisplay.style.display = 'none';
        }
    }

    // Child session creation
    async handleCreateChildSession() {
        this.hideChildModalError();

        // Get form values
        const enumeratorId = parseInt(document.getElementById('childEnumeratorId').value);
        const schoolId = document.getElementById('childSchool').value;
        const familyId = document.getElementById('childFamilyId').value.trim();
        const childId = document.getElementById('childChildId').value.trim();
        const name = document.getElementById('childName').value.trim();

        // Validation
        if (!enumeratorId || isNaN(enumeratorId)) {
            this.showChildModalError('Please enter a valid enumerator ID');
            return;
        }
        if (!schoolId) {
            this.showChildModalError('Please select a school');
            return;
        }
        if (!familyId || !childId || !name) {
            this.showChildModalError('Please fill in all fields');
            return;
        }

        // Get school name from schools array
        const school = this.schools.find(s => s.school_id === schoolId);
        const schoolName = school ? school.name : schoolId;

        try {
            await sessionManager.createChildSession(enumeratorId, familyId, childId, name, schoolName);
            await this.loadAndRenderSessions();
            SessionUIUtils.showSuccess('Child session created successfully');

            // Close modal and reset
            const modal = bootstrap.Modal.getInstance(document.getElementById('createChildSessionModal'));
            if (modal) {
                modal.hide();
                document.getElementById('createChildSessionForm').reset();
            }
        } catch (error) {
            console.error('Error creating child session:', error);
            this.showChildModalError(error.message);
        }
    }

    // Parent session creation
    async handleCreateParentSession() {
        this.hideParentModalError();

        // Get form values
        const enumeratorId = parseInt(document.getElementById('parentEnumeratorId').value);
        const schoolId = document.getElementById('parentSchool').value;
        const familyId = document.getElementById('parentFamilyId').value.trim();
        const child1Name = document.getElementById('parentChild1Name').value.trim();
        const child2Name = document.getElementById('parentChild2Name').value.trim();

        // Validation
        if (!enumeratorId || isNaN(enumeratorId)) {
            this.showParentModalError('Please enter a valid enumerator ID');
            return;
        }
        if (!schoolId) {
            this.showParentModalError('Please select a school');
            return;
        }
        if (!familyId || !child1Name || !child2Name) {
            this.showParentModalError('Please fill in all fields');
            return;
        }

        // Get school details from schools array
        const school = this.schools.find(s => s.school_id === schoolId);
        if (!school) {
            this.showParentModalError('Invalid school selected');
            return;
        }

        const schoolName = school.name;
        const groupType = school.type; // 'treatment' or 'control'

        // Generate preEarnings from one of four specific pairs: [1,6], [2,5], [5,2], [6,1]
        const preEarningsPairs = [[1,6], [2,5], [5,2], [6,1]];
        const randomPair = preEarningsPairs[Math.floor(Math.random() * 4)];
        const preEarnings1 = randomPair[0];
        const preEarnings2 = randomPair[1];

        try {
            await sessionManager.createParentSession(
                enumeratorId,
                familyId,
                child1Name,
                child2Name,
                schoolName,
                groupType,
                preEarnings1,
                preEarnings2
            );
            await this.loadAndRenderSessions();
            SessionUIUtils.showSuccess('Parent session created successfully');

            // Close modal and reset
            const modal = bootstrap.Modal.getInstance(document.getElementById('createParentSessionModal'));
            if (modal) {
                modal.hide();
                document.getElementById('createParentSessionForm').reset();
            }
        } catch (error) {
            console.error('Error creating parent session:', error);
            this.showParentModalError(error.message);
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
    async startChildSurvey(sessionId) {
        try {
            await sessionManager.markChildSurveyStarted(sessionId);
            window.location.href = `survey.html?session_id=${sessionId}`;
        } catch (error) {
            console.error('Error starting child survey:', error);
            SessionUIUtils.showError('Failed to start child survey');
        }
    }

    async startParentSession(sessionId) {
        try {
            // Get session to determine group type
            const session = await sessionManager.getSession(sessionId);
            if (!session) {
                throw new Error('Session not found');
            }

            await sessionManager.markParentSurveyStarted(sessionId);

            // Route to parent survey
            window.location.href = `survey.html?session_id=${sessionId}`;
        } catch (error) {
            console.error('Error starting parent session:', error);
            SessionUIUtils.showError('Failed to start parent session');
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

// Make it globally accessible for onclick handlers
window.indexUIManager = indexUI;

export { indexUI };