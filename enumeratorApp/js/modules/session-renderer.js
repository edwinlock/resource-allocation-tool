import { CONFIG } from './constants.js';
import { SessionUIUtils } from './shared-utils.js';

// UI rendering utilities for session data
export class SessionRenderer {
    static renderSessionRow(session) {
        const getActionButtons = (session) => {
            let buttons = [];
            
            // Always show View Details button first
            buttons.push(`<button class="btn btn-sm btn-info session-action" data-action="viewSessionDetails" data-session-id="${session.id}">View Details</button>`);
            
            if (session.surveyStatus !== 'completed') {
                buttons.push(`<button class="btn btn-sm btn-primary session-action" data-action="startSurvey" data-session-id="${session.id}">Start Survey</button>`);
            }
            
            if (session.sliderStatus !== 'completed') {
                buttons.push(`<button class="btn btn-sm btn-success session-action" data-action="startSlider" data-session-id="${session.id}">Start Slider</button>`);
            }
            
            buttons.push(`<button class="btn btn-sm btn-outline-danger session-action" data-action="deleteSession" data-session-id="${session.id}">Delete</button>`);
            
            return `<div class="action-buttons">${buttons.join('')}</div>`;
        };

        return `
            <tr>
                <td><code>${session.id.substring(0, 8)}...</code></td>
                <td>${session.participantId || '-'}</td>
                <td>${session.enumeratorID || '-'}</td>
                <td>${SessionUIUtils.getStatusDisplay(session.surveyStatus, true, session.surveyCompletedAt)}</td>
                <td>${SessionUIUtils.getStatusDisplay(session.sliderStatus, true, session.sliderCompletedAt)}</td>
                <td>${getActionButtons(session)}</td>
            </tr>
        `;
    }

    static async renderSessions(sessions) {
        const tbody = document.getElementById('sessionsTableBody');
        
        if (!tbody) return;
        
        if (sessions.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-muted py-4">
                        No sessions found. Create a new session to get started.
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = sessions.map(session => this.renderSessionRow(session)).join('');
    }

    static displaySessionData(session, responses) {
        // Hide loading, show content
        const loadingState = document.getElementById('loadingState');
        const sessionContent = document.getElementById('sessionContent');
        
        if (loadingState) loadingState.style.display = 'none';
        if (sessionContent) sessionContent.style.display = 'block';

        // Session Overview
        SessionUIUtils.updateElementText('sessionId', session.id);
        SessionUIUtils.updateElementText('participantId', session.participantId || '-');
        SessionUIUtils.updateElementText('enumeratorId', session.enumeratorID || '-');
        SessionUIUtils.updateElementText('createdAt', SessionUIUtils.formatDate(session.createdAt));
        SessionUIUtils.updateElementText('child1Ability', session.child1ability || '-');
        SessionUIUtils.updateElementText('child2Ability', session.child2ability || '-');

        // Status Timeline
        SessionUIUtils.updateElementHTML('surveyStatus', SessionUIUtils.getStatusDisplay(session.surveyStatus));
        SessionUIUtils.updateElementText('surveyStarted', SessionUIUtils.formatDate(session.surveyStartedAt));
        SessionUIUtils.updateElementText('surveyCompleted', SessionUIUtils.formatDate(session.surveyCompletedAt));
        
        SessionUIUtils.updateElementHTML('sliderStatus', SessionUIUtils.getStatusDisplay(session.sliderStatus));
        SessionUIUtils.updateElementText('sliderStarted', SessionUIUtils.formatDate(session.sliderStartedAt));
        SessionUIUtils.updateElementText('sliderCompleted', SessionUIUtils.formatDate(session.sliderCompletedAt));

        // Response Data
        this.displayResponseData(responses);
    }

    static displayResponseData(responses) {
        const responseCount = document.getElementById('responseCount');
        const noResponses = document.getElementById('noResponses');
        const responsesTable = document.getElementById('responsesTable');
        const tbody = document.getElementById('responsesTableBody');

        if (responseCount) {
            responseCount.textContent = `${responses.length} response${responses.length !== 1 ? 's' : ''}`;
        }

        if (responses.length === 0) {
            if (noResponses) noResponses.style.display = 'block';
            if (responsesTable) responsesTable.style.display = 'none';
        } else {
            if (noResponses) noResponses.style.display = 'none';
            if (responsesTable) responsesTable.style.display = 'block';

            if (tbody) {
                tbody.innerHTML = responses.map(response => `
                    <tr>
                        <td>${response.displayOrder}</td>
                        <td>${response.scenarioNumber}</td>
                        <td>${response.child1investment}</td>
                        <td>${CONFIG.ALLOCATABLE_BUDGET - response.child1investment}</td>
                        <td>${SessionUIUtils.formatDate(response.completedAt)}</td>
                    </tr>
                `).join('');
            }
        }
    }

    static showError(message) {
        const loadingState = document.getElementById('loadingState');
        const errorState = document.getElementById('errorState');
        const errorMessage = document.getElementById('errorMessage');
        
        if (loadingState) loadingState.style.display = 'none';
        if (errorMessage) errorMessage.textContent = message;
        if (errorState) errorState.style.display = 'block';
    }
}