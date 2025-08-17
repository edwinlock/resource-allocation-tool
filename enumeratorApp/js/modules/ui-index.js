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
            const sessions = await sessionManager.loadSessions();
            await SessionRenderer.renderSessions(sessions);
            
            const sessionCount = document.getElementById('sessionCount');
            if (sessionCount) {
                sessionCount.textContent = sessions.length;
            }
        } catch (error) {
            console.error('Error loading sessions:', error);
            SessionUIUtils.showError(`Failed to load sessions: ${error.message}`);
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

        // Refresh button
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.loadAndRenderSessions();
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
                const action = event.target.dataset.action;
                const sessionId = event.target.dataset.sessionId;
                
                if (action && sessionId) {
                    switch (action) {
                        case 'viewSessionDetails':
                            this.viewSessionDetails(sessionId);
                            break;
                        case 'startSurvey':
                            this.startSurvey(sessionId);
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
    }

    async handleCreateSession() {
        const participantId = document.getElementById('participantId').value.trim();
        const enumeratorId = document.getElementById('enumeratorId').value.trim();
        const child1Ability = parseInt(document.getElementById('child1Ability').value);
        const child2Ability = parseInt(document.getElementById('child2Ability').value);

        // Clear any previous modal errors
        SessionUIUtils.hideModalError();

        if (!participantId || !enumeratorId) {
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
            await sessionManager.createSession(participantId, enumeratorId, child1Ability, child2Ability);
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
    async startSurvey(sessionId) {
        try {
            await sessionManager.markSurveyStarted(sessionId);
            window.location.href = `survey.html?sessionId=${sessionId}`;
        } catch (error) {
            console.error('Error starting survey:', error);
            SessionUIUtils.showError('Failed to start survey');
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
}

// Initialize the index UI manager
const indexUI = new IndexUIManager();

// Export indexUI for module access
export { indexUI };