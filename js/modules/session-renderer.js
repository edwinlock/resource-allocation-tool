import { CONFIG } from './constants.js';
import { SessionUIUtils } from './shared-utils.js';

// UI rendering utilities for session data
export class SessionRenderer {
    static renderSessionRow(session) {
        const getActionButtons = (session) => {
            let buttons = [];

            // Always show Details button first
            buttons.push(`<button class="btn btn-sm btn-info session-action" data-action="viewSessionDetails" data-session-id="${session.id}">Details</button>`);

            // Always show Start button - gray out if completed
            if (session.sessionType === 'child') {
                // Child session - one survey button, always visible
                const surveyCompleted = session.surveyStatus === 'completed';
                const btnClass = surveyCompleted ? 'btn btn-sm btn-outline-secondary' : 'btn btn-sm btn-primary';
                const btnDisabled = surveyCompleted ? 'disabled' : '';
                const btnText = surveyCompleted ? 'Start ✓' : 'Start';
                buttons.push(`<button class="${btnClass} session-action" data-action="startChildSurvey" data-session-id="${session.id}" ${btnDisabled}>${btnText}</button>`);
            } else if (session.sessionType === 'parent') {
                // Parent session - Start button always visible, grayed out when complete
                const allCompleted = session.groupType === 'treatment'
                    ? (session.surveyStatus === 'completed' && session.sliderStatus === 'completed' && session.exitSurveyStatus === 'completed')
                    : session.surveyStatus === 'completed';
                const btnClass = allCompleted ? 'btn btn-sm btn-outline-secondary' : 'btn btn-sm btn-success';
                const btnDisabled = allCompleted ? 'disabled' : '';
                const btnText = allCompleted ? 'Start ✓' : 'Start';
                buttons.push(`<button class="${btnClass} session-action" data-action="startParentSession" data-session-id="${session.id}" ${btnDisabled}>${btnText}</button>`);
            } else {
                // Unknown session type - show disabled button
                buttons.push(`<button class="btn btn-sm btn-outline-secondary session-action" disabled>Start</button>`);
            }

            // Always show Delete button
            buttons.push(`<button class="btn btn-sm btn-outline-danger session-action" data-action="deleteSession" data-session-id="${session.id}">Delete</button>`);

            // Add Download JSON icon as rightmost element, only if session is complete
            const isComplete = this.isSessionComplete(session);
            if (isComplete) {
                buttons.push(`<a href="#" class="session-action text-primary d-inline-flex align-items-center ms-3" data-action="downloadSessionJson" data-session-id="${session.id}" title="Download JSON" style="text-decoration: none;"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" class="bi bi-download" viewBox="0 0 16 16"><path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5"/><path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708z"/></svg></a>`);
            }

            return `<div class="action-buttons">${buttons.join('')}</div>`;
        };

        const getUploadStatusBadge = (session) => {
            const isComplete = this.isSessionComplete(session);
            const uploadStatus = session.uploadStatus || 'not_uploaded';

            if (!isComplete) {
                const missing = this.getMissingComponents(session);
                return `<span class="badge bg-secondary" title="Missing: ${missing.join(', ')}">Incomplete</span>`;
            } else if (uploadStatus === 'uploaded') {
                return `<span class="badge bg-success">Uploaded ✓</span>`;
            } else if (uploadStatus === 'uploading') {
                return `<span class="badge bg-warning">Uploading...</span>`;
            } else if (uploadStatus === 'upload_failed') {
                return `<span class="badge bg-danger">Upload Failed</span>`;
            } else {
                return `<span class="badge bg-info">Ready to Upload</span>`;
            }
        };

        // Helper methods for session completion (made static to access from here)
        const isSessionComplete = (session) => {
            if (!session) return false;

            if (session.sessionType === 'child') {
                return session.surveyStatus === 'completed';
            } else if (session.sessionType === 'parent') {
                const surveyDone = session.surveyStatus === 'completed';
                if (session.groupType === 'treatment') {
                    return surveyDone &&
                           session.sliderStatus === 'completed' &&
                           session.exitSurveyStatus === 'completed';
                } else {
                    return surveyDone;
                }
            }
            return false;
        };

        const getMissingComponents = (session) => {
            if (!session) return ['Session not found'];

            const missing = [];

            if (session.sessionType === 'child') {
                if (session.surveyStatus !== 'completed') {
                    missing.push('Child Survey');
                }
            } else if (session.sessionType === 'parent') {
                if (session.surveyStatus !== 'completed') {
                    missing.push('Parent Survey');
                }
                if (session.groupType === 'treatment') {
                    if (session.sliderStatus !== 'completed') {
                        missing.push('Slider Exercise');
                    }
                    if (session.exitSurveyStatus !== 'completed') {
                        missing.push('Exit Survey');
                    }
                }
            }

            return missing;
        };

        // Make helper functions available to getActionButtons
        this.isSessionComplete = isSessionComplete;
        this.getMissingComponents = getMissingComponents;

        const sessionTypeDisplay = session.sessionType
            ? session.sessionType.charAt(0).toUpperCase() + session.sessionType.slice(1)
            : 'Unknown';

        const rowClass = session.sessionType === 'child' ? 'session-row-child' :
                        session.sessionType === 'parent' ? 'session-row-parent' : '';

        return `
            <tr class="${rowClass}">
                <td><code>${session.id.substring(0, 8)}...</code></td>
                <td>${session.familyId || '-'}</td>
                <td>${session.enumeratorId || '-'}</td>
                <td>${sessionTypeDisplay}</td>
                <td>${getUploadStatusBadge(session)}</td>
                <td>${getActionButtons(session)}</td>
            </tr>
        `;
    }

    static async renderCurrentSessions(sessions) {
        const tbody = document.getElementById('currentSessionsTableBody');

        if (!tbody) return;

        if (sessions.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-muted py-4">
                        No current sessions found. Create a new session to get started.
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = sessions.map(session => this.renderSessionRow(session)).join('');
    }

    static async renderUploadedSessions(sessions) {
        const tbody = document.getElementById('uploadedSessionsTableBody');

        if (!tbody) return;

        if (sessions.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-muted py-4">
                        No uploaded sessions yet.
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = sessions.map(session => this.renderUploadedSessionRow(session)).join('');
    }

    static renderUploadedSessionRow(session) {
        const sessionTypeDisplay = session.sessionType
            ? session.sessionType.charAt(0).toUpperCase() + session.sessionType.slice(1)
            : 'Unknown';

        const rowClass = session.sessionType === 'child' ? 'session-row-child' :
                        session.sessionType === 'parent' ? 'session-row-parent' : '';

        return `
            <tr class="${rowClass}">
                <td><code>${session.id.substring(0, 8)}...</code></td>
                <td>${session.familyId || '-'}</td>
                <td>${session.enumeratorId || '-'}</td>
                <td>${sessionTypeDisplay}</td>
                <td>${SessionUIUtils.formatDate(session.uploadedAt)}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-info session-action" data-action="viewSessionDetails" data-session-id="${session.id}">Details</button>
                        <a href="#" class="session-action text-primary d-inline-flex align-items-center ms-3" data-action="downloadSessionJson" data-session-id="${session.id}" title="Download JSON" style="text-decoration: none;"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" class="bi bi-download" viewBox="0 0 16 16"><path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5"/><path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708z"/></svg></a>
                    </div>
                </td>
            </tr>
        `;
    }

    static displaySessionData(session, sliderResponses, surveyResponses) {
        // Hide loading, show content
        const loadingState = document.getElementById('loadingState');
        const sessionContent = document.getElementById('sessionContent');

        if (loadingState) loadingState.style.display = 'none';
        if (sessionContent) sessionContent.style.display = 'block';

        // Common Session Overview Fields
        SessionUIUtils.updateElementText('sessionId', session.id);
        SessionUIUtils.updateElementText('familyId', session.familyId || '-');
        SessionUIUtils.updateElementText('enumeratorId', session.enumeratorId || '-');
        SessionUIUtils.updateElementText('createdAt', SessionUIUtils.formatDate(session.createdAt));
        SessionUIUtils.updateElementText('school', session.school || '-');
        SessionUIUtils.updateElementText('sessionType', session.sessionType ? session.sessionType.charAt(0).toUpperCase() + session.sessionType.slice(1) : '-');

        // Show/hide session-type specific fields and status cards
        const childSessionFields = document.getElementById('childSessionFields');
        const parentSessionFields = document.getElementById('parentSessionFields');
        const childStatusCard = document.getElementById('childStatusCard');
        const parentStatusCard = document.getElementById('parentStatusCard');
        const sliderDataCard = document.getElementById('sliderDataCard');

        if (session.sessionType === 'child') {
            // Child Session: show child fields and child status
            if (childSessionFields) childSessionFields.style.display = 'block';
            if (parentSessionFields) parentSessionFields.style.display = 'none';
            if (childStatusCard) childStatusCard.style.display = 'block';
            if (parentStatusCard) parentStatusCard.style.display = 'none';
            if (sliderDataCard) sliderDataCard.style.display = 'none';

            SessionUIUtils.updateElementText('childName', session.name || '-');
            SessionUIUtils.updateElementText('childId', session.childId || '-');

            // Child status
            SessionUIUtils.updateElementHTML('childSurveyStatus', SessionUIUtils.getStatusDisplay(session.surveyStatus || 'not_started'));
            SessionUIUtils.updateElementText('childSurveyCompleted', SessionUIUtils.formatDate(session.surveyCompletedAt));

        } else if (session.sessionType === 'parent') {
            // Parent Session: show parent fields and parent status
            if (childSessionFields) childSessionFields.style.display = 'none';
            if (parentSessionFields) parentSessionFields.style.display = 'block';
            if (childStatusCard) childStatusCard.style.display = 'none';
            if (parentStatusCard) parentStatusCard.style.display = 'block';

            SessionUIUtils.updateElementText('child1Name', session.child1Name || '-');
            SessionUIUtils.updateElementText('child2Name', session.child2Name || '-');
            SessionUIUtils.updateElementText('child1PreEarnings', session.preEarnings1 || '-');
            SessionUIUtils.updateElementText('child2PreEarnings', session.preEarnings2 || '-');
            SessionUIUtils.updateElementText('groupType', session.groupType ? session.groupType.charAt(0).toUpperCase() + session.groupType.slice(1) : '-');

            // Parent status
            SessionUIUtils.updateElementHTML('parentSurveyStatus', SessionUIUtils.getStatusDisplay(session.surveyStatus || 'not_started'));
            SessionUIUtils.updateElementText('parentSurveyCompleted', SessionUIUtils.formatDate(session.surveyCompletedAt));

            // Show slider and exit survey columns only for treatment group
            const sliderStatusCol = document.getElementById('sliderStatusCol');
            const exitSurveyCol = document.getElementById('exitSurveyCol');

            if (session.groupType === 'treatment') {
                if (sliderStatusCol) sliderStatusCol.style.display = 'block';
                if (exitSurveyCol) exitSurveyCol.style.display = 'block';
                if (sliderDataCard) sliderDataCard.style.display = 'block';

                SessionUIUtils.updateElementHTML('sliderStatus', SessionUIUtils.getStatusDisplay(session.sliderStatus || 'not_started'));
                SessionUIUtils.updateElementText('sliderStarted', SessionUIUtils.formatDate(session.sliderStartedAt));
                SessionUIUtils.updateElementText('sliderCompleted', SessionUIUtils.formatDate(session.sliderCompletedAt));

                SessionUIUtils.updateElementHTML('exitSurveyStatus', SessionUIUtils.getStatusDisplay(session.exitSurveyStatus || 'not_started'));
                SessionUIUtils.updateElementText('exitSurveyCompleted', SessionUIUtils.formatDate(session.exitSurveyCompletedAt));
            } else {
                if (sliderStatusCol) sliderStatusCol.style.display = 'none';
                if (exitSurveyCol) exitSurveyCol.style.display = 'none';
                if (sliderDataCard) sliderDataCard.style.display = 'none';
            }
        }

        // Survey Response Data
        this.displaySurveyResponseData(surveyResponses);

        // Slider Response Data (only shown if card is visible)
        if (sliderDataCard && sliderDataCard.style.display !== 'none') {
            this.displayResponseData(sliderResponses);
        }
    }

    static displaySurveyResponseData(surveyResponses) {
        const surveyResponseCount = document.getElementById('surveyResponseCount');
        const noSurveyResponses = document.getElementById('noSurveyResponses');
        const surveyResponsesContent = document.getElementById('surveyResponsesContent');

        if (surveyResponseCount) {
            surveyResponseCount.textContent = `${surveyResponses.length} response${surveyResponses.length !== 1 ? 's' : ''}`;
        }

        if (surveyResponses.length === 0) {
            if (noSurveyResponses) noSurveyResponses.style.display = 'block';
            if (surveyResponsesContent) surveyResponsesContent.style.display = 'none';
        } else {
            if (noSurveyResponses) noSurveyResponses.style.display = 'none';
            if (surveyResponsesContent) surveyResponsesContent.style.display = 'block';

            // Group responses by survey ID
            const groupedResponses = {};
            surveyResponses.forEach(response => {
                if (!groupedResponses[response.surveyId]) {
                    groupedResponses[response.surveyId] = [];
                }
                groupedResponses[response.surveyId].push(response);
            });

            // Create HTML for each survey
            let html = '';
            Object.keys(groupedResponses).forEach(surveyId => {
                const responses = groupedResponses[surveyId];
                const surveyName = this.getSurveyDisplayName(surveyId);

                html += `
                    <div class="mb-4">
                        <h6 class="text-primary mb-3">📋 ${surveyName}</h6>
                        <div class="survey-responses">
                `;

                responses.forEach(response => {
                    const formattedAnswer = this.formatSurveyAnswer(response.answer);
                    html += `
                        <div class="mb-3 p-3 bg-light rounded">
                            <strong>Question:</strong> ${response.questionId}<br>
                            <strong>Answer:</strong> ${formattedAnswer}
                        </div>
                    `;
                });

                html += `
                        </div>
                    </div>
                `;
            });

            if (surveyResponsesContent) {
                surveyResponsesContent.innerHTML = html;
            }
        }
    }

    static getSurveyDisplayName(surveyId) {
        const displayNames = {
            'Child1': 'Child 1 Demographics Survey',
            'Child2': 'Child 2 Demographics Survey',
            'Treatment': 'Treatment Group Survey',
            'Control': 'Control Group Survey'
        };
        return displayNames[surveyId] || `${surveyId} Survey`;
    }

    static formatSurveyAnswer(answer) {
        if (answer === null || answer === undefined) {
            return '<em>No response</em>';
        }
        if (Array.isArray(answer)) {
            if (answer.length === 0) {
                return '<em>No selections</em>';
            }
            return answer.join(', ');
        }
        return String(answer);
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