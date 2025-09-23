import { CONFIG } from './constants.js';
import { SessionUIUtils } from './shared-utils.js';

// UI rendering utilities for session data
export class SessionRenderer {
    static renderSessionRow(session) {
        const getActionButtons = (session) => {
            let buttons = [];

            // Always show Details button first
            buttons.push(`<button class="btn btn-sm btn-info session-action" data-action="viewSessionDetails" data-session-id="${session.id}">Details</button>`);

            // Child 1 Survey button - always show, gray out if completed
            const child1Completed = session.child1SurveyStatus === 'completed';
            const child1BtnClass = child1Completed ? 'btn btn-sm btn-outline-secondary' : 'btn btn-sm btn-primary';
            const child1BtnDisabled = child1Completed ? 'disabled' : '';
            const child1BtnText = child1Completed ? 'Child 1 Survey ✓' : 'Child 1 Survey';
            buttons.push(`<button class="${child1BtnClass} session-action" data-action="startChild1Survey" data-session-id="${session.id}" ${child1BtnDisabled}>${child1BtnText}</button>`);

            // Child 2 Survey button - always show, gray out if completed
            const child2Completed = session.child2SurveyStatus === 'completed';
            const child2BtnClass = child2Completed ? 'btn btn-sm btn-outline-secondary' : 'btn btn-sm btn-primary';
            const child2BtnDisabled = child2Completed ? 'disabled' : '';
            const child2BtnText = child2Completed ? 'Child 2 Survey ✓' : 'Child 2 Survey';
            buttons.push(`<button class="${child2BtnClass} session-action" data-action="startChild2Survey" data-session-id="${session.id}" ${child2BtnDisabled}>${child2BtnText}</button>`);

            // Parent Survey button - always show, gray out if completed
            if (session.sessionType === 'treatment') {
                const treatmentCompleted = session.treatmentSurveyStatus === 'completed';
                const treatmentBtnClass = treatmentCompleted ? 'btn btn-sm btn-outline-secondary' : 'btn btn-sm btn-secondary';
                const treatmentBtnDisabled = treatmentCompleted ? 'disabled' : '';
                const treatmentBtnText = treatmentCompleted ? 'Parent Survey ✓' : 'Parent Survey';
                buttons.push(`<button class="${treatmentBtnClass} session-action" data-action="startTreatmentSurvey" data-session-id="${session.id}" ${treatmentBtnDisabled}>${treatmentBtnText}</button>`);
            } else if (session.sessionType === 'control') {
                const controlCompleted = session.controlSurveyStatus === 'completed';
                const controlBtnClass = controlCompleted ? 'btn btn-sm btn-outline-secondary' : 'btn btn-sm btn-secondary';
                const controlBtnDisabled = controlCompleted ? 'disabled' : '';
                const controlBtnText = controlCompleted ? 'Parent Survey ✓' : 'Parent Survey';
                buttons.push(`<button class="${controlBtnClass} session-action" data-action="startControlSurvey" data-session-id="${session.id}" ${controlBtnDisabled}>${controlBtnText}</button>`);
            }

            // Slider button - always show, gray out if completed
            const sliderCompleted = session.sliderStatus === 'completed';
            const sliderBtnClass = sliderCompleted ? 'btn btn-sm btn-outline-secondary' : 'btn btn-sm btn-success';
            const sliderBtnDisabled = sliderCompleted ? 'disabled' : '';
            const sliderBtnText = sliderCompleted ? 'Slider ✓' : 'Slider';
            buttons.push(`<button class="${sliderBtnClass} session-action" data-action="startSlider" data-session-id="${session.id}" ${sliderBtnDisabled}>${sliderBtnText}</button>`);

            // Upload button - consistent "Upload" text, different colors for status
            const isComplete = this.isSessionComplete(session);
            const uploadStatus = session.uploadStatus || 'not_uploaded';

            if (isComplete) {
                if (uploadStatus === 'uploaded') {
                    buttons.push(`<button class="btn btn-sm btn-success" disabled>Upload</button>`);
                } else if (uploadStatus === 'uploading') {
                    buttons.push(`<button class="btn btn-sm btn-warning" disabled>Upload</button>`);
                } else if (uploadStatus === 'upload_failed') {
                    buttons.push(`<button class="btn btn-sm btn-danger session-action" data-action="uploadSession" data-session-id="${session.id}">Upload</button>`);
                } else {
                    buttons.push(`<button class="btn btn-sm btn-primary session-action" data-action="uploadSession" data-session-id="${session.id}">Upload</button>`);
                }
            } else {
                buttons.push(`<button class="btn btn-sm btn-outline-secondary" disabled>Upload</button>`);
            }

            buttons.push(`<button class="btn btn-sm btn-outline-danger session-action" data-action="deleteSession" data-session-id="${session.id}">Delete</button>`);

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

            const child1Complete = session.child1SurveyStatus === 'completed';
            const child2Complete = session.child2SurveyStatus === 'completed';
            const sliderComplete = session.sliderStatus === 'completed';

            let parentSurveyComplete = false;
            if (session.sessionType === 'treatment') {
                parentSurveyComplete = session.treatmentSurveyStatus === 'completed';
            } else if (session.sessionType === 'control') {
                parentSurveyComplete = session.controlSurveyStatus === 'completed';
            }

            return child1Complete && child2Complete && parentSurveyComplete && sliderComplete;
        };

        const getMissingComponents = (session) => {
            if (!session) return ['Session not found'];

            const missing = [];

            if (session.child1SurveyStatus !== 'completed') {
                missing.push('Child 1 Survey');
            }
            if (session.child2SurveyStatus !== 'completed') {
                missing.push('Child 2 Survey');
            }
            if (session.sessionType === 'treatment' && session.treatmentSurveyStatus !== 'completed') {
                missing.push('Parent Survey');
            }
            if (session.sessionType === 'control' && session.controlSurveyStatus !== 'completed') {
                missing.push('Parent Survey');
            }
            if (session.sliderStatus !== 'completed') {
                missing.push('Slider Exercise');
            }

            return missing;
        };

        // Make helper functions available to getActionButtons
        this.isSessionComplete = isSessionComplete;
        this.getMissingComponents = getMissingComponents;

        const childrenDisplay = session.child1name && session.child2name
            ? `${session.child1name}, ${session.child2name}`
            : '-';


        const sessionTypeDisplay = session.sessionType
            ? session.sessionType.charAt(0).toUpperCase() + session.sessionType.slice(1)
            : 'Unknown';

        const badgeColor = session.sessionType === 'treatment' ? 'primary' :
                          session.sessionType === 'control' ? 'secondary' : 'warning';

        return `
            <tr>
                <td><code>${session.id.substring(0, 8)}...</code></td>
                <td>${session.participantId || '-'}</td>
                <td>${session.enumeratorID || '-'}</td>
                <td>${childrenDisplay}</td>
                <td><span class="badge bg-${badgeColor}">${sessionTypeDisplay}</span></td>
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
                    <td colspan="7" class="text-center text-muted py-4">
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
                    <td colspan="7" class="text-center text-muted py-4">
                        No uploaded sessions yet.
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = sessions.map(session => this.renderUploadedSessionRow(session)).join('');
    }

    static renderUploadedSessionRow(session) {
        const childrenDisplay = session.child1name && session.child2name
            ? `${session.child1name}, ${session.child2name}`
            : '-';

        const sessionTypeDisplay = session.sessionType
            ? session.sessionType.charAt(0).toUpperCase() + session.sessionType.slice(1)
            : 'Unknown';

        const badgeColor = session.sessionType === 'treatment' ? 'primary' :
                          session.sessionType === 'control' ? 'secondary' : 'warning';

        return `
            <tr>
                <td><code>${session.id.substring(0, 8)}...</code></td>
                <td>${session.participantId || '-'}</td>
                <td>${session.enumeratorID || '-'}</td>
                <td>${childrenDisplay}</td>
                <td><span class="badge bg-${badgeColor}">${sessionTypeDisplay}</span></td>
                <td>${SessionUIUtils.formatDate(session.uploadedAt)}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-info session-action" data-action="viewSessionDetails" data-session-id="${session.id}">Details</button>
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

        // Session Overview
        SessionUIUtils.updateElementText('sessionId', session.id);
        SessionUIUtils.updateElementText('participantId', session.participantId || '-');
        SessionUIUtils.updateElementText('enumeratorId', session.enumeratorID || '-');
        SessionUIUtils.updateElementText('createdAt', SessionUIUtils.formatDate(session.createdAt));
        SessionUIUtils.updateElementText('child1Name', session.child1name || '-');
        SessionUIUtils.updateElementText('child2Name', session.child2name || '-');
        SessionUIUtils.updateElementText('child1Ability', session.child1ability || '-');
        SessionUIUtils.updateElementText('child2Ability', session.child2ability || '-');
        SessionUIUtils.updateElementText('school', session.school || '-');
        SessionUIUtils.updateElementText('sessionType', session.sessionType ? session.sessionType.charAt(0).toUpperCase() + session.sessionType.slice(1) : '-');

        // Status Timeline - Individual Survey Statuses
        SessionUIUtils.updateElementHTML('child1SurveyStatus', SessionUIUtils.getStatusDisplay(session.child1SurveyStatus || 'not_started'));
        SessionUIUtils.updateElementText('child1SurveyCompleted', SessionUIUtils.formatDate(session.child1SurveyCompletedAt));

        SessionUIUtils.updateElementHTML('child2SurveyStatus', SessionUIUtils.getStatusDisplay(session.child2SurveyStatus || 'not_started'));
        SessionUIUtils.updateElementText('child2SurveyCompleted', SessionUIUtils.formatDate(session.child2SurveyCompletedAt));

        // Parent survey (Treatment or Control based on session type)
        const mainSurveyTitle = document.getElementById('mainSurveyTitle');
        if (mainSurveyTitle) {
            mainSurveyTitle.textContent = 'Parent Survey';
        }

        const mainSurveyStatus = session.sessionType === 'treatment' ? session.treatmentSurveyStatus : session.controlSurveyStatus;
        const mainSurveyCompleted = session.sessionType === 'treatment' ? session.treatmentSurveyCompletedAt : session.controlSurveyCompletedAt;

        SessionUIUtils.updateElementHTML('mainSurveyStatus', SessionUIUtils.getStatusDisplay(mainSurveyStatus || 'not_started'));
        SessionUIUtils.updateElementText('mainSurveyCompleted', SessionUIUtils.formatDate(mainSurveyCompleted));

        SessionUIUtils.updateElementHTML('sliderStatus', SessionUIUtils.getStatusDisplay(session.sliderStatus));
        SessionUIUtils.updateElementText('sliderStarted', SessionUIUtils.formatDate(session.sliderStartedAt));
        SessionUIUtils.updateElementText('sliderCompleted', SessionUIUtils.formatDate(session.sliderCompletedAt));

        // Survey Response Data
        this.displaySurveyResponseData(surveyResponses);

        // Slider Response Data
        this.displayResponseData(sliderResponses);
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