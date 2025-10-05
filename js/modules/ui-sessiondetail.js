import { sessionManager } from './session-coordinator.js';
import { SessionRenderer } from './session-renderer.js';
import { SessionUIUtils } from './shared-utils.js';

// UI Management for sessiondetail.html page
class SessionDetailUIManager {
    constructor() {
        this.sessionId = null;
        this.bindEvents();
    }

    bindEvents() {
        document.addEventListener('DOMContentLoaded', () => {
            this.initialize();
        });
    }

    async initialize() {
        // Get session ID from URL
        const urlParams = new URLSearchParams(window.location.search);
        this.sessionId = urlParams.get('sessionId');
        
        if (!this.sessionId) {
            SessionRenderer.showError('No session ID provided in URL.');
            return;
        }

        await this.loadSessionDetails();
    }

    async loadSessionDetails() {
        try {
            // Load session data
            const session = await sessionManager.getSession(this.sessionId);
            if (!session) {
                SessionRenderer.showError(`Session with ID "${this.sessionId}" not found.`);
                return;
            }

            // Load slider response data
            const sliderResponses = await sessionManager.getSessionSliderResponses(this.sessionId);

            // Load survey response data
            const surveyResponses = await sessionManager.getSessionSurveyResponses(this.sessionId);

            // Display the data
            SessionRenderer.displaySessionData(session, sliderResponses, surveyResponses);

            // Display upload status
            this.displayUploadStatus(session);

        } catch (error) {
            console.error('Error loading session details:', error);
            SessionRenderer.showError(`Failed to load session: ${error.message}`);
        }
    }

    displayUploadStatus(session) {
        // Check if session is complete
        const isComplete = sessionManager.isSessionComplete(session);
        const missing = sessionManager.getMissingComponents(session);
        const uploadStatus = session.uploadStatus || 'not_uploaded';

        // Update completion status
        SessionUIUtils.updateElementText('sessionComplete', isComplete ? 'Yes ✓' : `No - Missing: ${missing.join(', ')}`);

        // Update upload status
        let statusDisplay = '';
        let statusColor = '';

        switch (uploadStatus) {
            case 'uploaded':
                statusDisplay = 'Uploaded ✓';
                statusColor = 'text-success';
                break;
            case 'uploading':
                statusDisplay = 'Uploading...';
                statusColor = 'text-warning';
                break;
            case 'upload_failed':
                statusDisplay = 'Upload Failed ❌';
                statusColor = 'text-danger';
                break;
            default:
                statusDisplay = isComplete ? 'Ready to Upload' : 'Not Ready';
                statusColor = isComplete ? 'text-info' : 'text-secondary';
        }

        const statusElement = document.getElementById('uploadStatus');
        if (statusElement) {
            statusElement.textContent = statusDisplay;
            statusElement.className = statusColor;
        }

        // Update uploaded timestamp
        SessionUIUtils.updateElementText('uploadedAt', SessionUIUtils.formatDate(session.uploadedAt));

        // Show/hide error section
        const errorDiv = document.getElementById('uploadError');
        if (uploadStatus === 'upload_failed' && errorDiv) {
            errorDiv.style.display = 'block';
            SessionUIUtils.updateElementText('uploadErrorMessage', 'Upload failed - please try again');
        } else if (errorDiv) {
            errorDiv.style.display = 'none';
        }

        // Update action buttons
        this.updateUploadActions(session, isComplete, uploadStatus);
    }

    updateUploadActions(session, isComplete, uploadStatus) {
        const actionsDiv = document.getElementById('uploadActions');
        if (!actionsDiv) return;

        let buttonsHTML = '';

        if (isComplete) {
            if (uploadStatus === 'uploaded') {
                buttonsHTML = `
                    <button class="btn btn-outline-success" disabled>
                        ✓ Session Uploaded
                    </button>
                    <button class="btn btn-info ms-2" onclick="sessionDetailUI.previewData('${session.id}')">
                        Download JSON
                    </button>
                `;
            } else if (uploadStatus === 'uploading') {
                buttonsHTML = `
                    <button class="btn btn-warning" disabled>
                        Uploading...
                    </button>
                `;
            } else {
                buttonsHTML = `
                    <button class="btn btn-warning" onclick="sessionDetailUI.uploadSession('${session.id}')">
                        Upload Session
                    </button>
                    <button class="btn btn-info ms-2" onclick="sessionDetailUI.previewData('${session.id}')">
                        Download JSON
                    </button>
                `;
            }
        } else {
            buttonsHTML = `
                <button class="btn btn-outline-secondary" disabled>
                    Upload
                </button>
            `;
        }

        actionsDiv.innerHTML = buttonsHTML;
    }

    async uploadSession(sessionId) {
        try {
            await sessionManager.uploadSession(sessionId);
            SessionUIUtils.showSuccess('Session uploaded successfully');

            // Reload session details to update status
            await this.loadSessionDetails();

        } catch (error) {
            console.error('Error uploading session:', error);
            SessionUIUtils.showError(`Upload failed: ${error.message}`);

            // Reload session details to show error state
            await this.loadSessionDetails();
        }
    }

    async previewData(sessionId) {
        try {
            // Aggregate session data and download immediately
            const data = await sessionManager.aggregateSessionData(sessionId);
            const jsonString = JSON.stringify(data, null, 2);

            // Create blob and download
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `session_${sessionId.substring(0, 8)}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

        } catch (error) {
            console.error('Error downloading data:', error);
            SessionUIUtils.showError(`Failed to download data: ${error.message}`);
        }
    }
}

// Initialize the session detail UI manager
const sessionDetailUI = new SessionDetailUIManager();

// Make it globally accessible for onclick handlers
window.sessionDetailUI = sessionDetailUI;