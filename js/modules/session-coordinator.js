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
    async createChildSession(enumeratorId, familyId, childId, name, school) {
        return await this.sessionDB.createChildSession(enumeratorId, familyId, childId, name, school);
    }

    async createParentSession(enumeratorId, familyId, child1Name, child2Name, school, groupType, preEarnings1, preEarnings2) {
        return await this.sessionDB.createParentSession(enumeratorId, familyId, child1Name, child2Name, school, groupType, preEarnings1, preEarnings2);
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

    async markChildSurveyStarted(sessionId) {
        return await this.sessionDB.markChildSurveyStarted(sessionId);
    }

    async markChildSurveyCompleted(sessionId) {
        return await this.sessionDB.markChildSurveyCompleted(sessionId);
    }

    async markParentSurveyStarted(sessionId) {
        return await this.sessionDB.markParentSurveyStarted(sessionId);
    }

    async markParentSurveyCompleted(sessionId) {
        return await this.sessionDB.markParentSurveyCompleted(sessionId);
    }

    async markSliderStarted(sessionId) {
        return await this.sessionDB.markSliderStarted(sessionId);
    }

    async markSliderCompleted(sessionId) {
        return await this.sessionDB.markSliderCompleted(sessionId);
    }

    async markExitSurveyStarted(sessionId) {
        return await this.sessionDB.markExitSurveyStarted(sessionId);
    }

    async markExitSurveyCompleted(sessionId) {
        return await this.sessionDB.markExitSurveyCompleted(sessionId);
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

            // Get session to determine type
            const session = await this.getSession(sessionId);

            // Mark appropriate survey as completed based on session type
            if (session.sessionType === 'child') {
                await this.markChildSurveyCompleted(sessionId);
            } else if (session.sessionType === 'parent') {
                // For parent sessions, check if it's the main survey (Treatment/Control) or Exit
                if (surveyId === 'Treatment' || surveyId === 'Control') {
                    await this.markParentSurveyCompleted(sessionId);
                } else if (surveyId === 'Exit') {
                    await this.markExitSurveyCompleted(sessionId);
                }
            }
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

        if (session.sessionType === 'child') {
            // Child session is complete when survey is done
            return session.surveyStatus === 'completed';
        } else if (session.sessionType === 'parent') {
            // Parent session completion depends on group type
            const surveyDone = session.surveyStatus === 'completed';

            if (session.groupType === 'treatment') {
                // Treatment: requires survey, slider, and exit survey
                return surveyDone &&
                       session.sliderStatus === 'completed' &&
                       session.exitSurveyStatus === 'completed';
            } else {
                // Control: only requires survey
                return surveyDone;
            }
        }

        return false;
    }

    getMissingComponents(session) {
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

            // Build base aggregated data structure
            const aggregatedData = {
                sessionMetadata: {
                    sessionId: session.id,
                    sessionType: session.sessionType,
                    enumeratorId: session.enumeratorId,
                    createdAt: session.createdAt,
                    familyId: session.familyId,
                    school: session.school
                },
                surveyResponses: surveyResponses.map(response => ({
                    id: response.id,
                    surveyId: response.surveyId,
                    questionId: response.questionId,
                    answer: response.answer,
                    completedAt: response.completedAt
                }))
            };

            // Add session-type-specific data
            if (session.sessionType === 'child') {
                aggregatedData.sessionMetadata.childId = session.childId;
                aggregatedData.sessionMetadata.childName = session.name;
                aggregatedData.completionTimestamps = {
                    surveyCompleted: session.surveyCompletedAt
                };
            } else if (session.sessionType === 'parent') {
                aggregatedData.sessionMetadata.child1Name = session.child1Name;
                aggregatedData.sessionMetadata.child2Name = session.child2Name;
                aggregatedData.sessionMetadata.groupType = session.groupType;
                aggregatedData.sessionMetadata.preEarnings1 = session.preEarnings1;
                aggregatedData.sessionMetadata.preEarnings2 = session.preEarnings2;

                aggregatedData.completionTimestamps = {
                    surveyCompleted: session.surveyCompletedAt
                };

                // Include slider responses for treatment group
                if (session.groupType === 'treatment') {
                    const sliderResponses = await this.getSessionSliderResponses(sessionId);
                    aggregatedData.sliderResponses = sliderResponses.map(response => ({
                        scenarioNumber: response.scenarioNumber,
                        displayOrder: response.displayOrder,
                        child1investment: response.child1investment,
                        child2investment: response.child1investment ? (9 - response.child1investment) : null,
                        completedAt: response.completedAt,
                        scenarioGamma: response.scenarioGamma,
                        scenarioSigma: response.scenarioSigma,
                        scenarioTheta: response.scenarioTheta,
                        preEarnings1: response.preEarnings1,
                        preEarnings2: response.preEarnings2,
                        scenarioAlpha: response.scenarioAlpha,
                        child1FinalEarnings: response.child1FinalEarnings,
                        child2FinalEarnings: response.child2FinalEarnings,
                        aggregateFinalEarnings: response.aggregateFinalEarnings
                    }));
                    aggregatedData.completionTimestamps.sliderStarted = session.sliderStartedAt;
                    aggregatedData.completionTimestamps.sliderCompleted = session.sliderCompletedAt;
                    aggregatedData.completionTimestamps.exitSurveyCompleted = session.exitSurveyCompletedAt;
                }
            }

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