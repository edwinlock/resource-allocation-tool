import { SCENARIOS } from './constants.js';
import { appState } from './app-state.js';
import { sessionDB } from './sessionDB.js';
import { sliderResponseDB } from './sliderResponseDB.js';

// Session Coordinator - orchestrates session and response operations with business logic
export class SessionCoordinator {
    constructor() {
        // Coordinate between sessionDB and sliderResponseDB
        this.sessionDB = sessionDB;
        this.responseDB = sliderResponseDB;
    }


    // Database operations that require coordination
    async resetDatabase() {
        try {
            // Close both databases if they're open
            if (this.sessionDB.db && this.sessionDB.db.isOpen()) {
                this.sessionDB.db.close();
            }
            if (this.responseDB.db && this.responseDB.db.isOpen()) {
                this.responseDB.db.close();
            }
            
            // Delete both databases (only if they exist)
            if (this.sessionDB.db) {
                await this.sessionDB.db.delete();
            }
            if (this.responseDB.db) {
                await this.responseDB.db.delete();
            }
            
            // Reinitialize both instances
            this.sessionDB.initializeDatabase();
            this.responseDB.initializeDatabase();
            
            // Ensure both are open (only if databases were created successfully)
            if (this.sessionDB.db) {
                await this.sessionDB.ensureOpen();
            }
            if (this.responseDB.db) {
                await this.responseDB.ensureOpen();
            }
        } catch (error) {
            console.error('Error during database reset:', error);
            throw new Error('Failed to reset databases');
        }
    }

    async deleteSession(sessionId) {
        if (!this.sessionDB.db) return;
        
        // Ensure both databases are open
        await this.sessionDB.ensureOpen();
        await this.responseDB.ensureOpen();
        
        // Delete from both databases - not atomic but acceptable for this use case
        try {
            // Delete responses first (safe if session delete fails)
            await this.responseDB.deleteSessionResponses(sessionId);
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

    // Delegate methods to appropriate DB classes
    
    // Session operations
    async createSession(participantId, enumeratorId, child1Ability, child2Ability) {
        return await this.sessionDB.createSession(participantId, enumeratorId, child1Ability, child2Ability);
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
}

// Create and export singleton instance for backward compatibility
export const sessionManager = new SessionCoordinator();