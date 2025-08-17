import { sessionManager } from './session-coordinator.js';
import { SessionRenderer } from './session-renderer.js';

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

            // Load response data
            const responses = await sessionManager.getSessionSliderResponses(this.sessionId);
            
            // Display the data
            SessionRenderer.displaySessionData(session, responses);
            
        } catch (error) {
            console.error('Error loading session details:', error);
            SessionRenderer.showError(`Failed to load session: ${error.message}`);
        }
    }
}

// Initialize the session detail UI manager
new SessionDetailUIManager();