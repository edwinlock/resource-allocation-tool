import { SurveyManager } from './survey-system.js';
import { sessionManager } from './session-coordinator.js';

// Simple UI management for survey.html page
class SurveyUIManager {
    constructor() {
        this.surveyManager = new SurveyManager();
        this.sessionData = null;
        this.initialize();
    }

    async initialize() {
        try {
            // Get URL parameters (initializeFromURL is now async)
            const { sessionId, surveyId } = await this.surveyManager.initializeFromURL();

            // Load session data to get variables for substitution
            this.sessionData = await sessionManager.getSession(sessionId);
            if (!this.sessionData) {
                throw new Error(`Session ${sessionId} not found`);
            }

            // Update session info display
            this.updateSessionInfo();

            // Load and render survey
            await this.surveyManager.loadSurvey(surveyId);

            // Create variables for substitution based on session type
            const variables = {
                sessionType: this.sessionData.sessionType || 'unknown',
                enumerator: this.sessionData.enumeratorId || 'Enumerator',
                familyId: this.sessionData.familyId || 'Family',
                school: this.sessionData.school || 'School'
            };

            // Add session-type specific variables
            if (this.sessionData.sessionType === 'child') {
                variables.childName = this.sessionData.name || 'Child';
                variables.childId = this.sessionData.childId || '';
            } else if (this.sessionData.sessionType === 'parent') {
                variables.preEarnings1 = this.sessionData.preEarnings1 || 5;
                variables.preEarnings2 = this.sessionData.preEarnings2 || 2;
                variables.child1name = this.sessionData.child1Name || 'Child 1';
                variables.child2name = this.sessionData.child2Name || 'Child 2';
            }

            // Render survey
            const surveyHTML = await this.surveyManager.renderSurvey(variables);

            // Show survey content
            document.getElementById('loadingState').style.display = 'none';
            document.getElementById('surveyContent').innerHTML = surveyHTML;
            document.getElementById('surveyContent').style.display = 'block';

            // Setup form submission
            this.setupFormHandlers();

        } catch (error) {
            console.error('Error initializing survey:', error);
            this.showError(error.message);
        }
    }

    updateSessionInfo() {
        document.getElementById('session-id').textContent =
            this.sessionData.id ? this.sessionData.id.substring(0, 8) + '...' : '-';
        document.getElementById('participant-id').textContent =
            this.sessionData.familyId || '-';
        document.getElementById('enumerator-id').textContent =
            this.sessionData.enumeratorId || '-';
    }

    setupFormHandlers() {
        // Handle form submission
        const form = document.getElementById('survey-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleSubmit();
            });
        }

        // Handle back button
        const backBtn = document.getElementById('survey-back-btn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                window.location.href = 'index.html';
            });
        }
    }

    async handleSubmit() {
        try {
            // Get survey responses
            const result = this.surveyManager.getSurveyResponses();

            // Check for validation errors (needed for multiselect questions)
            if (!result.valid) {
                this.showValidationErrors(result.errors);
                return;
            }

            // Save responses to database
            await sessionManager.completeSurveySession(
                this.sessionData.id,
                this.surveyManager.surveyId,
                result.responses
            );

            // Redirect based on session type
            const sessionId = this.sessionData.id;

            if (this.sessionData.sessionType === 'child') {
                // Child session: go to thanks page
                window.location.href = 'thanks.html';
            } else if (this.sessionData.sessionType === 'parent') {
                // Parent session: check if treatment or control
                if (this.sessionData.groupType === 'treatment') {
                    // Treatment workflow: Treatment → Dummy Slider → Sandwich → Real Slider → Exit
                    if (this.surveyManager.surveyId === 'Treatment') {
                        // After treatment survey, go to dummy slider (practice round)
                        await sessionManager.markSliderStarted(sessionId);
                        window.location.href = `slider.html?sessionId=${sessionId}&dummy=true`;
                    } else if (this.surveyManager.surveyId === 'Sandwich') {
                        // After sandwich survey, go to real slider
                        window.location.href = `slider.html?sessionId=${sessionId}`;
                    } else if (this.surveyManager.surveyId === 'Exit') {
                        // After exit survey, go to thanks page
                        window.location.href = 'thanks.html';
                    } else {
                        // Unknown survey in treatment workflow
                        window.location.href = 'thanks.html';
                    }
                } else {
                    // Control group: go directly to thanks page
                    window.location.href = 'thanks.html';
                }
            } else {
                // Unknown session type: go to index
                window.location.href = 'thanks.html';
            }

        } catch (error) {
            console.error('Error submitting survey:', error);
            this.showError('Failed to save survey responses: ' + error.message);
        }
    }

    showValidationErrors(errors) {
        // Show validation errors (primarily for multiselect questions)
        let errorMessage = 'Please correct the following errors:\n\n';
        errors.forEach(error => {
            errorMessage += `• ${error.message}\n`;
        });
        alert(errorMessage);
    }

    showError(message) {
        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('surveyContent').style.display = 'none';
        document.getElementById('errorMessage').textContent = message;
        document.getElementById('errorState').style.display = 'block';
    }

    showSuccess() {
        document.getElementById('surveyContent').style.display = 'none';
        document.getElementById('successState').style.display = 'block';
    }
}

// Initialize the survey UI manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new SurveyUIManager();
});