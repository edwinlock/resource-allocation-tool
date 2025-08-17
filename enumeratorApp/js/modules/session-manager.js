import { SCENARIOS } from './constants.js';
import { generateUUID, getUTCDate } from './utilities.js';
import { appState } from './app-state.js';

// Session Manager - handles session data operations only (no UI)
export class SessionManager {
    constructor() {
        this.db = null;
        this.initializeDatabase();
    }

    // Database operations
    initializeDatabase() {
        if (typeof Dexie !== 'undefined') {
            this.db = new Dexie('AppDB');
            
            // Version 1: Original schema
            this.db.version(1).stores({
                sessions: 'id, participantId, enumeratorID, createdAt, surveyStartedAt, surveyCompletedAt, surveyStatus, sliderStartedAt, sliderCompletedAt, sliderStatus, child1ability, child2ability',
                pageResponses: 'id, sessionId, scenarioNumber, displayOrder, child1investment, completedAt'
            });
            
            // Version 2: Add compound unique index for participantId + enumeratorID
            this.db.version(2).stores({
                sessions: 'id, participantId, enumeratorID, createdAt, surveyStartedAt, surveyCompletedAt, surveyStatus, sliderStartedAt, sliderCompletedAt, sliderStatus, child1ability, child2ability, [participantId+enumeratorID]',
                pageResponses: 'id, sessionId, scenarioNumber, displayOrder, child1investment, completedAt'
            });
        } else {
            console.warn('Dexie not available, running without database persistence');
        }
    }

    async ensureOpen() {
        if (this.db && !this.db.isOpen()) {
            await this.db.open();
        }
    }

    async resetDatabase() {
        if (!this.db) return;
        
        try {
            if (this.db.isOpen()) {
                this.db.close();
            }
            await this.db.delete();
            this.initializeDatabase();
            await this.ensureOpen();
        } catch (error) {
            console.error('Error resetting database:', error);
            throw error;
        }
    }

    // Session CRUD operations
    async createSession(participantId, enumeratorId, child1Ability, child2Ability) {
        if (!this.db) {
            throw new Error('Database not available');
        }

        await this.ensureOpen();
        
        // Check for existing session with same participant and enumerator
        const existingSession = await this.db.sessions
            .where('[participantId+enumeratorID]')
            .equals([participantId, enumeratorId])
            .first();
            
        if (existingSession) {
            throw new Error(`A session already exists for Participant "${participantId}" and Enumerator "${enumeratorId}". Each participant-enumerator combination can only have one session.`);
        }

        const sessionId = generateUUID();
        
        try {
            await this.db.sessions.add({
                id: sessionId,
                participantId: participantId,
                enumeratorID: enumeratorId,
                createdAt: getUTCDate(),
                surveyStartedAt: null,
                surveyCompletedAt: null,
                surveyStatus: 'not_started',
                sliderStartedAt: null,
                sliderCompletedAt: null,
                sliderStatus: 'not_started',
                child1ability: child1Ability,
                child2ability: child2Ability
            });
        } catch (error) {
            if (error.name === 'ConstraintError') {
                throw new Error(`A session already exists for Participant "${participantId}" and Enumerator "${enumeratorId}". Each participant-enumerator combination can only have one session.`);
            }
            throw error;
        }
        
        return sessionId;
    }

    async loadSessions() {
        if (!this.db) return [];
        
        try {
            await this.ensureOpen();
            return await this.db.sessions.orderBy('id').reverse().toArray();
        } catch (error) {
            console.error('Error loading sessions:', error);
            throw error;
        }
    }

    async getSession(sessionId) {
        if (!this.db) return null;
        
        try {
            await this.ensureOpen();
            return await this.db.sessions.get(sessionId);
        } catch (error) {
            console.error('Error getting session:', error);
            throw error;
        }
    }

    async updateSessionStatus(sessionId, updates) {
        if (!this.db) return;
        
        try {
            await this.ensureOpen();
            await this.db.sessions.update(sessionId, updates);
        } catch (error) {
            console.error('Error updating session:', error);
            throw error;
        }
    }

    async deleteSession(sessionId) {
        if (!this.db) return;
        
        try {
            await this.ensureOpen();
            await this.db.sessions.delete(sessionId);
            await this.db.pageResponses.where('sessionId').equals(sessionId).delete();
        } catch (error) {
            console.error('Error deleting session:', error);
            throw error;
        }
    }

    // Response operations
    async saveAllResponses(sessionId, responses) {
        if (!this.db) return;
        
        // Convert responses array to database records
        const responseRecords = responses.map(response => ({
            id: generateUUID(),
            sessionId,
            scenarioNumber: response.scenarioNumber,
            displayOrder: response.displayOrder,
            child1investment: response.child1investment,
            completedAt: response.completedAt
        }));

        // Bulk insert all responses
        await this.db.pageResponses.bulkAdd(responseRecords);
    }

    async completeSliderSession(sessionId, responses) {
        if (!this.db) return;
        
        // Save all responses and mark slider as completed in a transaction
        await this.db.transaction('rw', this.db.sessions, this.db.pageResponses, async () => {
            await this.saveAllResponses(sessionId, responses);
            await this.db.sessions.update(sessionId, {
                sliderCompletedAt: getUTCDate(),
                sliderStatus: 'completed'
            });
        });
    }

    async getSessionSliderResponses(sessionId) {
        if (!this.db) return [];
        
        try {
            await this.ensureOpen();
            const responses = await this.db.pageResponses
                .where('sessionId')
                .equals(sessionId)
                .toArray();
            
            // Sort by displayOrder after retrieving
            return responses.sort((a, b) => a.displayOrder - b.displayOrder);
        } catch (error) {
            console.error('Error getting session responses:', error);
            return [];
        }
    }

    // Session state management for slider app
    async initializeSession(sessionId, totalScenarios) {
        appState.initializeSession(sessionId, totalScenarios);
        return appState.sliderState;
    }


    // Application initialization for slider app
    async startSession(totalScenarios = SCENARIOS.length) {
        try {
            // Use dummy session id instead of database session
            await this.initializeSession(appState.session.id, totalScenarios);
            
            return appState.sliderState;
        } catch (error) {
            console.error('Error starting session:', error);
            console.error('Error details:', error.message);
            console.error('Error stack:', error.stack);
            // Error will be handled by calling UI layer
            throw error;
        }
    }

    // Navigation business logic for slider app
    async processNextScenario() {
        try {
            // Add response to global state
            appState.addResponse(appState.selectedInvestment);
            
            // Check if this was the last scenario
            if (appState.isLastScenario()) {
                // Save all responses to database and mark session as completed
                await this.completeSliderSession(appState.sliderState.sessionId, appState.sliderState.responses.filter(r => r !== null));
                
                console.log('Session completed and saved!', {
                    sessionId: appState.sliderState.sessionId,
                    totalResponses: appState.sliderState.responses.filter(r => r !== null).length,
                    responses: appState.sliderState.responses
                });
                
                return { completed: true };
            } else {
                // Advance to next scenario
                appState.advanceToNextScenario();
                
                // Get the new scenario and recalculate outcomes
                const newScenario = SCENARIOS[appState.sliderState.currentScenarioNumber];
                appState.computeScenarioOutcomes(newScenario);
                
                return { 
                    completed: false, 
                    newScenario,
                    currentIndex: appState.sliderState.currentIndex 
                };
            }
        } catch (error) {
            console.error('Error processing response:', error);
            throw error;
        }
    }

    async processPreviousScenario() {
        try {
            // Go to previous scenario
            appState.goToPreviousScenario();
            
            // Get the previous scenario and recalculate outcomes
            const prevScenario = SCENARIOS[appState.sliderState.currentScenarioNumber];
            appState.computeScenarioOutcomes(prevScenario);
            
            // Get the saved response if it exists
            const savedResponse = appState.sliderState.responses[appState.sliderState.currentIndex];
            
            return { 
                prevScenario,
                savedResponse,
                currentIndex: appState.sliderState.currentIndex 
            };
        } catch (error) {
            console.error('Error going to previous scenario:', error);
            throw error;
        }
    }

    // Debug utilities
    logCurrentState() {
        console.log('Current session state:', {
            sessionId: appState.sliderState.sessionId,
            currentScenario: appState.sliderState.currentScenarioNumber,
            displayOrder: appState.getCurrentDisplayOrder(),
            responsesCollected: appState.sliderState.responses.filter(r => r !== null).length,
            responses: appState.sliderState.responses
        });
    }

    // Pure data operations - UI rendering moved to UI modules

    // Action button handlers for index page
    // Navigation helpers for UI layers
    async markSurveyStarted(sessionId) {
        await this.updateSessionStatus(sessionId, {
            surveyStartedAt: getUTCDate(),
            surveyStatus: 'in_progress'
        });
    }

    async markSliderStarted(sessionId) {
        await this.updateSessionStatus(sessionId, {
            sliderStartedAt: getUTCDate(),
            sliderStatus: 'in_progress'
        });
    }

    // Session detail display methods moved to UI modules
}

// Create and export singleton instance
export const sessionManager = new SessionManager();

// Export clean API - no global pollution