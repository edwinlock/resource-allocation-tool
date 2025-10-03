import { SCENARIOS } from './constants.js';
import { appState } from './app-state.js';
import { sessionDB } from './sessionDB.js';
import { sliderResponseDB } from './sliderResponseDB.js';
import { surveyResponseDB } from './surveyResponseDB.js';

// Session Coordinator - orchestrates session and response operations with business logic
export class SessionCoordinator {
    constructor() {
        // Coordinate between sessionDB, sliderResponseDB, and surveyResponseDB
        this.sessionDB = sessionDB;
        this.responseDB = sliderResponseDB;
        this.surveyResponseDB = surveyResponseDB;
    }


    // Database operations that require coordination
    async resetDatabase() {
        try {
            // Close all databases if they're open
            if (this.sessionDB.db && this.sessionDB.db.isOpen()) {
                this.sessionDB.db.close();
            }
            if (this.responseDB.db && this.responseDB.db.isOpen()) {
                this.responseDB.db.close();
            }
            if (this.surveyResponseDB.db && this.surveyResponseDB.db.isOpen()) {
                this.surveyResponseDB.db.close();
            }

            // Delete all databases (only if they exist)
            if (this.sessionDB.db) {
                await this.sessionDB.db.delete();
            }
            if (this.responseDB.db) {
                await this.responseDB.db.delete();
            }
            if (this.surveyResponseDB.db) {
                await this.surveyResponseDB.db.delete();
            }

            // Reinitialize all instances
            this.sessionDB.initializeDatabase();
            this.responseDB.initializeDatabase();
            this.surveyResponseDB.initializeDatabase();

            // Ensure all are open (only if databases were created successfully)
            if (this.sessionDB.db) {
                await this.sessionDB.ensureOpen();
            }
            if (this.responseDB.db) {
                await this.responseDB.ensureOpen();
            }
            if (this.surveyResponseDB.db) {
                await this.surveyResponseDB.ensureOpen();
            }
        } catch (error) {
            console.error('Error during database reset:', error);
            throw new Error('Failed to reset databases');
        }
    }

    async deleteSession(sessionId) {
        if (!this.sessionDB.db) return;

        // Ensure all databases are open
        await this.sessionDB.ensureOpen();
        await this.responseDB.ensureOpen();
        await this.surveyResponseDB.ensureOpen();

        // Delete from all databases - not atomic but acceptable for this use case
        try {
            // Delete responses first (safe if session delete fails)
            await this.responseDB.deleteSessionResponses(sessionId);
            await this.surveyResponseDB.deleteSessionSurveyResponses(sessionId);
            // Then delete session
            await this.sessionDB.deleteSession(sessionId);
        } catch (error) {
            console.error('Error in coordinated session deletion:', error);
            // In a research context, partial failures are acceptable
            // Could implement retry logic here if needed
            throw error;
        }
    }

    async completeSliderSession(sessionId, responses) {
        // Ensure both databases are open
        await this.sessionDB.ensureOpen();
        await this.responseDB.ensureOpen();
        
        // Complete across both databases - not atomic but acceptable for research use
        try {
            // Save all responses first
            await this.responseDB.completeSliderSession(sessionId, responses);
            // Then mark session as completed
            await this.sessionDB.markSliderCompleted(sessionId);
        } catch (error) {
            console.error('Error in coordinated session completion:', error);
            // In research context, could retry the whole operation
            // Responses are saved, session status can be fixed manually if needed
            throw error;
        }
    }

    // Application initialization for slider app
    async startSession(totalScenarios = SCENARIOS.length) {
        try {
            return await appState.startSession(totalScenarios);
        } catch (error) {
            console.error('Error starting session:', error);
            console.error('Error details:', error.message);
            console.error('Error stack:', error.stack);
            throw error;
        }
    }

    // Navigation coordination for slider app
    async processNextScenario() {
        try {
            // Delegate state logic to AppState
            const result = await appState.processNextScenario();
            
            // Handle database operations if session is completed
            if (result.completed) {
                await this.completeSliderSession(appState.sliderState.sessionId, result.responses);
                return { completed: true };
            }
            
            return result;
        } catch (error) {
            console.error('Error processing response:', error);
            throw error;
        }
    }

    async processPreviousScenario() {
        try {
            // Delegate state logic to AppState
            return await appState.processPreviousScenario();
        } catch (error) {
            console.error('Error going to previous scenario:', error);
            throw error;
        }
    }

    // Debug utilities

    // Delegate methods to appropriate DB classes
    
    // Session operations
    async createSession(participantId, enumeratorId, child1Ability, child2Ability, child1Name, child2Name, school, sessionType) {
        return await this.sessionDB.createSession(participantId, enumeratorId, child1Ability, child2Ability, child1Name, child2Name, school, sessionType);
    }

    async loadSessions() {
        return await this.sessionDB.loadSessions();
    }

    async getSession(sessionId) {
        return await this.sessionDB.getSession(sessionId);
    }

    async updateSessionStatus(sessionId, updates) {
        return await this.sessionDB.updateSessionStatus(sessionId, updates);
    }

    async markSurveyStarted(sessionId) {
        return await this.sessionDB.markSurveyStarted(sessionId);
    }

    async markSliderStarted(sessionId) {
        return await this.sessionDB.markSliderStarted(sessionId);
    }

    // Response operations
    async saveAllResponses(sessionId, responses) {
        return await this.responseDB.saveAllResponses(sessionId, responses);
    }

    async getSessionSliderResponses(sessionId) {
        return await this.responseDB.getSessionSliderResponses(sessionId);
    }

    async addSingleResponse(sessionId, response) {
        return await this.responseDB.addSingleResponse(sessionId, response);
    }

    async getResponseStatistics(sessionId) {
        return await this.responseDB.getResponseStatistics(sessionId);
    }

    // Survey response operations
    async completeSurveySession(sessionId, surveyId, responses) {
        if (!this.sessionDB.db || !this.surveyResponseDB.db) return;

        // Ensure both databases are open
        await this.sessionDB.ensureOpen();
        await this.surveyResponseDB.ensureOpen();

        // Complete across both databases
        try {
            // Save all survey responses first
            await this.surveyResponseDB.completeSurveySession(sessionId, surveyId, responses);
            // Then mark specific survey as completed
            const surveyStatusField = `${surveyId.toLowerCase()}SurveyStatus`;
            const surveyCompletedField = `${surveyId.toLowerCase()}SurveyCompletedAt`;

            const statusUpdate = {};
            statusUpdate[surveyStatusField] = 'completed';
            statusUpdate[surveyCompletedField] = new Date().toISOString();

            await this.sessionDB.updateSessionStatus(sessionId, statusUpdate);
        } catch (error) {
            console.error('Error in coordinated survey completion:', error);
            throw error;
        }
    }

    async getSessionSurveyResponses(sessionId, surveyId = null) {
        return await this.surveyResponseDB.getSessionSurveyResponses(sessionId, surveyId);
    }

    async getSurveyStatistics(sessionId, surveyId) {
        return await this.surveyResponseDB.getSurveyStatistics(sessionId, surveyId);
    }

    // Session completion validation
    isSessionComplete(session) {
        if (!session) return false;

        // Check all required surveys are completed
        const child1Complete = session.child1SurveyStatus === 'completed';
        const child2Complete = session.child2SurveyStatus === 'completed';

        // Check parent workflow based on session type
        let parentWorkflowComplete = false;
        if (session.sessionType === 'treatment') {
            // Treatment: requires parent survey, slider, and exit survey
            parentWorkflowComplete = session.treatmentSurveyStatus === 'completed' &&
                                    session.sliderStatus === 'completed' &&
                                    session.exitSurveyStatus === 'completed';
        } else if (session.sessionType === 'control') {
            // Control: only requires parent survey
            parentWorkflowComplete = session.controlSurveyStatus === 'completed';
        }

        return child1Complete && child2Complete && parentWorkflowComplete;
    }

    getMissingComponents(session) {
        if (!session) return ['Session not found'];

        const missing = [];

        if (session.child1SurveyStatus !== 'completed') {
            missing.push(session.child1name || 'Child 1');
        }
        if (session.child2SurveyStatus !== 'completed') {
            missing.push(session.child2name || 'Child 2');
        }

        // For treatment: check parent survey, slider, and exit survey
        if (session.sessionType === 'treatment') {
            if (session.treatmentSurveyStatus !== 'completed' ||
                session.sliderStatus !== 'completed' ||
                session.exitSurveyStatus !== 'completed') {
                missing.push('Parent');
            }
        }
        // For control: only check parent survey
        else if (session.sessionType === 'control' && session.controlSurveyStatus !== 'completed') {
            missing.push('Parent');
        }

        return missing;
    }

    async getCompletedSessions() {
        const allSessions = await this.loadSessions();
        return allSessions.filter(session => this.isSessionComplete(session));
    }

    // Data aggregation for upload
    async aggregateSessionData(sessionId) {
        try {
            // Get session details
            const session = await this.getSession(sessionId);
            if (!session) {
                throw new Error(`Session ${sessionId} not found`);
            }

            if (!this.isSessionComplete(session)) {
                throw new Error(`Session ${sessionId} is not complete`);
            }

            // Get all survey responses
            const surveyResponses = await this.getSessionSurveyResponses(sessionId);

            // Get slider responses
            const sliderResponses = await this.getSessionSliderResponses(sessionId);

            // Aggregate survey responses by survey type
            const surveysByType = {
                child1Survey: [],
                child2Survey: [],
                parentSurvey: []
            };

            surveyResponses.forEach(response => {
                if (response.surveyId === 'Child1') {
                    surveysByType.child1Survey.push({
                        questionId: response.questionId,
                        answer: response.answer,
                        completedAt: response.completedAt
                    });
                } else if (response.surveyId === 'Child2') {
                    surveysByType.child2Survey.push({
                        questionId: response.questionId,
                        answer: response.answer,
                        completedAt: response.completedAt
                    });
                } else if (response.surveyId === 'Treatment' || response.surveyId === 'Control') {
                    surveysByType.parentSurvey.push({
                        questionId: response.questionId,
                        answer: response.answer,
                        completedAt: response.completedAt
                    });
                }
            });

            // Format slider responses
            const formattedSliderResponses = sliderResponses.map(response => ({
                scenarioNumber: response.scenarioNumber,
                displayOrder: response.displayOrder,
                child1Investment: response.child1investment,
                child2Investment: response.child1investment ? (100 - response.child1investment) : null,
                completedAt: response.completedAt
            }));

            // Create aggregated data structure
            const aggregatedData = {
                sessionMetadata: {
                    sessionId: session.id,
                    participantId: session.participantId,
                    enumeratorId: session.enumeratorID,
                    sessionType: session.sessionType,
                    createdAt: session.createdAt,
                    completedAt: session.sliderCompletedAt || new Date().toISOString(),
                    children: {
                        child1: {
                            name: session.child1name,
                            ability: session.child1ability,
                            school: session.school
                        },
                        child2: {
                            name: session.child2name,
                            ability: session.child2ability,
                            school: session.school
                        }
                    }
                },
                surveyResponses: surveysByType,
                sliderResponses: formattedSliderResponses,
                completionTimestamps: {
                    child1SurveyCompleted: session.child1SurveyCompletedAt,
                    child2SurveyCompleted: session.child2SurveyCompletedAt,
                    parentSurveyCompleted: session.sessionType === 'treatment'
                        ? session.treatmentSurveyCompletedAt
                        : session.controlSurveyCompletedAt,
                    sliderCompleted: session.sliderCompletedAt
                }
            };

            return aggregatedData;

        } catch (error) {
            console.error('Error aggregating session data:', error);
            throw error;
        }
    }

    // Upload functionality
    async uploadSession(sessionId) {
        try {
            // Lazy load the API service to avoid circular import issues
            const { apiService } = await import('./api-service.js');

            // Get session to check current upload status
            const session = await this.getSession(sessionId);
            if (!session) {
                throw new Error(`Session ${sessionId} not found`);
            }

            if (session.uploadStatus === 'uploaded') {
                throw new Error('Session has already been uploaded');
            }

            if (!this.isSessionComplete(session)) {
                const missing = this.getMissingComponents(session);
                throw new Error(`Session is not complete. Missing: ${missing.join(', ')}`);
            }

            // Mark as uploading
            await this.sessionDB.updateSessionStatus(sessionId, {
                uploadStatus: 'uploading'
            });

            // Aggregate session data
            const sessionData = await this.aggregateSessionData(sessionId);

            // Upload to API
            const uploadResult = await apiService.uploadSession(sessionData);

            // Mark as uploaded
            await this.sessionDB.updateSessionStatus(sessionId, {
                uploadStatus: 'uploaded',
                uploadedAt: new Date().toISOString()
            });

            return uploadResult;

        } catch (error) {
            // Mark upload as failed
            await this.sessionDB.updateSessionStatus(sessionId, {
                uploadStatus: 'upload_failed'
            });

            console.error('Error uploading session:', error);
            throw error;
        }
    }

    async getUploadableSessions() {
        const allSessions = await this.loadSessions();
        return allSessions.filter(session =>
            this.isSessionComplete(session) &&
            session.uploadStatus !== 'uploaded'
        );
    }
}

// Create and export singleton instance for backward compatibility
export const sessionManager = new SessionCoordinator();