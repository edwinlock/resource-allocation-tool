import { sessionManager } from './session-coordinator.js';
import { SessionRenderer } from './session-renderer.js';
import { SessionUIUtils } from './shared-utils.js';

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

            // Separate current and uploaded sessions
            const currentSessions = allSessions.filter(session => session.uploadStatus !== 'uploaded');
            const uploadedSessions = allSessions.filter(session => session.uploadStatus === 'uploaded');

            // Render both tables
            await SessionRenderer.renderCurrentSessions(currentSessions);
            await SessionRenderer.renderUploadedSessions(uploadedSessions);

            // Update counts in header
            this.updateSessionCounts(currentSessions.length, uploadedSessions.length, allSessions.length);

            // Update table badges
            this.updateTableBadges(currentSessions.length, uploadedSessions.length);

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
                        case 'uploadSession':
                            this.uploadSession(sessionId);
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

    async uploadSession(sessionId) {
        try {
            await sessionManager.uploadSession(sessionId);
            await this.loadAndRenderSessions();
            SessionUIUtils.showSuccess('Session uploaded successfully');
        } catch (error) {
            console.error('Error uploading session:', error);
            SessionUIUtils.showError(`Upload failed: ${error.message}`);
        }
    }
}

// Initialize the index UI manager
const indexUI = new IndexUIManager();

// Export indexUI for module access
export { indexUI };