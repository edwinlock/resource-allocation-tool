import { CONFIG, SCENARIOS } from './constants.js';
import { generateUUID, getUTCDate } from './utilities.js';
import { appState } from './app-state.js';

// Database Functions - Dexie Database Setup (accessed from global Dexie)
let db;

export class SessionManager {
    constructor() {
        // Initialize Dexie database using the global Dexie instance
        if (typeof Dexie !== 'undefined') {
            db = new Dexie('MultiPageApp');
            db.version(1).stores({
                sessions: 'id, participantId, enumeratorID, startedAt, completedAt, status',
                pageResponses: 'id, sessionId, scenarioNumber, displayOrder, child1investment, completedAt'
            });
            this.db = db;
        } else {
            console.warn('Dexie not available, running without database persistence');
            this.db = null;
        }
    }

    // Database operations
    async createSession(participantId, enumeratorId) {
        const sessionId = generateUUID();
        
        if (this.db) {
            await this.db.sessions.add({
                id: sessionId,
                participantId,
                enumeratorId,
                startedAt: getUTCDate(),
                status: 'in_progress'
            });
        }
        
        return sessionId;
    }

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

    async completeSession(sessionId, responses) {
        if (!this.db) return;
        
        // Save all responses and complete session in a transaction
        await this.db.transaction('rw', this.db.sessions, this.db.pageResponses, async () => {
            await this.saveAllResponses(sessionId, responses);
            await this.db.sessions.update(sessionId, {
                completedAt: getUTCDate(),
                status: 'completed'
            });
        });
    }

    async getSessionSliderResponses(sessionId) {
        if (!this.db) return [];
        
        const responses = await this.db.pageResponses
            .where('sessionId')
            .equals(sessionId)
            .orderBy('displayOrder')
            .toArray();
        return responses;
    }

    // Session state management
    async initializeSession(sessionId, totalScenarios) {
        appState.initializeSession(sessionId, totalScenarios);
        return appState.sliderState;
    }

    // Navigation handlers
    async handleNextButtonClick() {
        try {
            // Add response to global state
            appState.addResponse(appState.selectedInvestment);
            
            // Check if this was the last scenario
            if (appState.isLastScenario()) {
                // For now, just log completion instead of saving to database
                console.log('Session completed!', {
                    sessionId: appState.sliderState.sessionId,
                    totalResponses: appState.sliderState.responses.filter(r => r !== null).length,
                    responses: appState.sliderState.responses
                });
                alert('Session completed! All responses collected.');
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
            alert('Error processing your input. Please try again.');
            throw error;
        }
    }

    async handlePrevButtonClick() {
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
            alert('Error going to previous scenario. Please try again.');
            throw error;
        }
    }

    // Button event handlers setup
    setupScenarioHandlers(uiManager, chartUpdateCallback) {
        console.log('Looking for buttons...');
        const nextButton = document.getElementById('nextButton');
        const prevButton = document.getElementById('prevButton');
        console.log('nextButton element:', nextButton);
        console.log('prevButton element:', prevButton);
        
        if (!nextButton) {
            throw new Error('nextButton element not found in DOM');
        }
        
        if (!prevButton) {
            throw new Error('prevButton element not found in DOM');
        }
        
        // Handle next button click
        nextButton.addEventListener('click', async () => {
            console.log('Next button clicked');
            const result = await this.handleNextButtonClick();
            
            if (!result.completed) {
                // Update charts and UI
                if (chartUpdateCallback) {
                    chartUpdateCallback();
                }
                uiManager.updateDebugDisplay();
                uiManager.updateScenarioDropdown();
                uiManager.updateProgressBar();
                uiManager.updateCurrentScenarioDisplay();
                uiManager.updateButtonVisibility();
            }
        });
        console.log('Event listener added to nextButton');
        
        // Handle previous button click
        prevButton.addEventListener('click', async () => {
            console.log('Previous button clicked');
            const result = await this.handlePrevButtonClick();
            
            // Update charts and UI
            if (chartUpdateCallback) {
                chartUpdateCallback();
            }
            uiManager.updateDebugDisplay();
            uiManager.updateScenarioDropdown();
            uiManager.updateProgressBar();
            uiManager.updateCurrentScenarioDisplay();
            uiManager.updateButtonVisibility();
            
            // Restore the previous response if it exists
            if (result.savedResponse) {
                uiManager.restoreUIFromResponse(result.savedResponse);
                if (chartUpdateCallback) {
                    chartUpdateCallback(); // Update charts with restored slider position
                }
            }
        });
        console.log('Event listener added to prevButton');
    }

    // Application initialization
    async startSession(totalScenarios = SCENARIOS.length, uiManager, chartUpdateCallback) {
        try {
            // Use dummy session id instead of database session
            await this.initializeSession(appState.session.id, totalScenarios);
            
            // Initialize UI elements
            uiManager.updateProgressBar();
            uiManager.updateCurrentScenarioDisplay();
            uiManager.updateButtonVisibility();
            
            // Set up navigation button handlers
            console.log('About to setup scenario handlers...');
            this.setupScenarioHandlers(uiManager, chartUpdateCallback);
            console.log('Scenario handlers set up successfully');
            console.log('Session state initialized:', appState.sliderState);
            
            return appState.sliderState;
        } catch (error) {
            console.error('Error starting session:', error);
            console.error('Error details:', error.message);
            console.error('Error stack:', error.stack);
            alert('Error starting session: ' + error.message + '. Please refresh and try again.');
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
}

// Create and export singleton instance
export const sessionManager = new SessionManager();

// Export functions for external use
export const SessionApp = {
    startSession: (totalScenarios, uiManager, chartUpdateCallback) => 
        sessionManager.startSession(totalScenarios, uiManager, chartUpdateCallback),
    getSessionSliderResponses: (sessionId) => 
        sessionManager.getSessionSliderResponses(sessionId),
    logCurrentState: () => sessionManager.logCurrentState(),
    sliderAppState: appState.sliderState // Expose state for debugging
};