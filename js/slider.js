// Main application entry point - modularized slider application
import { CONFIG } from './modules/constants.js';
import { SCENARIOS, loadScenarios } from './modules/scenario-loader.js';
import { appState } from './modules/app-state.js';
import { ChartManager } from './modules/chart-factory.js';
import { uiManager } from './modules/ui-slider.js';
import { sessionManager } from './modules/session-coordinator.js';
import { getUTCDate } from './modules/utilities.js';

// Application initialization
class SliderApp {
    constructor() {
        this.chartManager = null; // Will be initialized after loading session
    }

    // Parse URL parameters to get session ID
    getSessionIdFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('sessionId');
    }

    // Parse URL parameters to check for dummy mode
    getDummyModeFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('dummy') === 'true';
    }

    // Load session data from database
    async loadSessionFromDatabase(sessionId) {
        const session = await sessionManager.getSession(sessionId);
        if (!session) {
            throw new Error(`Session with ID "${sessionId}" not found in database.`);
        }

        return session;
    }

    async initialize() {
        try {
            // Get session ID and dummy mode from URL first
            const sessionId = this.getSessionIdFromURL();
            const isDummyMode = this.getDummyModeFromURL();

            // Load scenarios from JSON file - use dummy scenarios for practice round
            const scenariosFile = isDummyMode ? 'scenarios-dummy.json' : 'scenarios.json';
            await loadScenarios(scenariosFile);

            // Update the total scenarios display in the UI
            const totalScenariosSpan = document.getElementById('total-scenarios');
            if (totalScenariosSpan) {
                totalScenariosSpan.textContent = SCENARIOS.length;
            }

            if (!sessionId) {
                throw new Error('No session ID provided in URL. Please access this page from the session manager.');
            }

            // Load session from database
            const session = await this.loadSessionFromDatabase(sessionId);

            // Check if slider has already been completed
            if (session.sliderStatus === 'completed') {
                throw new Error('This slider session has already been completed. Please return to the session manager to view results.');
            }

            // Show practice round message if in dummy mode
            if (isDummyMode) {
                const practiceMessage = document.getElementById('practice-round-message');
                if (practiceMessage) {
                    practiceMessage.style.display = 'block';
                }
            }

            // Initialize ChartManager with generic child labels
            this.chartManager = new ChartManager(
                'Child 1',
                'Child 2'
            );

            // Update app state with real session data and dummy mode flag
            appState.updateSession({
                id: session.id,
                participant_id: session.familyId,
                enumerator_id: session.enumeratorId,
                date_created: session.createdAt || getUTCDate(),
                date_modified: session.sliderStartedAt || getUTCDate(),
                preEarnings1: session.preEarnings1 || 5, // Default values if not set
                preEarnings2: session.preEarnings2 || 2,
                isDummyMode: isDummyMode
            });

            // Initialize UI manager
            uiManager.initialize();

            // Setup chart-UI integration
            this.chartManager.setupUIChartIntegration(uiManager, appState, CONFIG);
            
            // Setup the chart update callback for session manager
            const chartUpdateCallback = () => {
                this.chartManager.updateChartData(appState, CONFIG);
            };
            
            // Initialize session management with the real session ID
            await sessionManager.startSession(SCENARIOS.length);
            
            // Initialize UI elements and setup navigation handlers
            uiManager.updateProgressBar();
            uiManager.updateCurrentScenarioDisplay();
            uiManager.updateButtonVisibility();
            
            // Set up navigation button handlers
            uiManager.setupScenarioHandlers(sessionManager, chartUpdateCallback);
            
            // Update the slider state with the real session ID
            appState.sliderState.sessionId = sessionId;
            
            // Now compute outcomes for the first randomized scenario
            const currentScenario = SCENARIOS[appState.sliderState.currentScenarioNumber];
            appState.computeScenarioOutcomes(currentScenario);
            
            // Create charts with proper scenario data
            this.chartManager.createAllCharts(uiManager, appState);
            
            // Update UI displays and chart visibility
            uiManager.updateChartVisibility();
            
            
        } catch (error) {
            console.error('Error initializing slider application:', error);
            console.error('Error details:', error.message);
            console.error('Error stack:', error.stack);
            
            // Cleanup any partially created resources
            if (this.chartManager) {
                this.chartManager.cleanup();
            }
            
            // Show user-friendly error message
            const errorContainer = document.createElement('div');
            const isCompletedSession = error.message.includes('already been completed');
            
            errorContainer.className = `alert ${isCompletedSession ? 'alert-warning' : 'alert-danger'} mt-3`;
            
            if (isCompletedSession) {
                errorContainer.innerHTML = `
                    <h4>✅ Session Already Completed</h4>
                    <p><strong>This slider session has already been completed.</strong></p>
                    <p>You can view the results in the session manager or start a new session.</p>
                    <div class="mt-3">
                        <a href="index.html" class="btn btn-primary me-2">Return to Session Manager</a>
                        <a href="sessiondetail.html?sessionId=${new URLSearchParams(window.location.search).get('sessionId')}" class="btn btn-info">View Session Details</a>
                    </div>
                `;
            } else {
                errorContainer.innerHTML = `
                    <h4>⚠️ Error Loading Session</h4>
                    <p><strong>Error:</strong> ${error.message}</p>
                    <p>Please check the following:</p>
                    <ul>
                        <li>Make sure you accessed this page from the session manager</li>
                        <li>Verify the session ID is correct</li>
                        <li>Ensure the session exists in the database</li>
                        <li>Check that the session has not already been completed</li>
                    </ul>
                    <a href="index.html" class="btn btn-primary">Return to Session Manager</a>
                `;
            }
            
            const container = document.querySelector('.container');
            if (container) {
                container.innerHTML = '';
                container.appendChild(errorContainer);
            } else {
                alert('Error initializing application: ' + error.message + '. Please return to the session manager and try again.');
            }
        }
    }
}

// Global reference to chart manager for cleanup
let globalChartManager = null;

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    
    // Small delay to ensure all DOM elements are ready
    setTimeout(async () => {
        const app = new SliderApp();
        globalChartManager = app.chartManager;
        await app.initialize();
    }, CONFIG.DOM_SETUP_DELAY_MS);
});

// Cleanup resources when page is being unloaded
window.addEventListener('beforeunload', () => {
    if (globalChartManager) {
        globalChartManager.cleanup();
    }
});

// Also cleanup on page visibility change (when user switches tabs)
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && globalChartManager) {
        // Optional: only cleanup if page is hidden for extended periods
        // This prevents unnecessary cleanup on quick tab switches
        setTimeout(() => {
            if (document.visibilityState === 'hidden' && globalChartManager) {
                globalChartManager.cleanup();
            }
        }, 30000); // 30 seconds
    }
});

// sessionManager is available as module import - no global access needed