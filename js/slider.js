// Main application entry point - modularized slider application
import './modules/error-handler.js';
import { CONFIG } from './modules/constants.js';
import { SCENARIOS, SCENARIOS_METADATA, loadScenarios } from './modules/scenario-loader.js';
import { appState } from './modules/app-state.js';
import { ChartManager } from './modules/chart-factory.js';
import { uiManager } from './modules/ui-slider.js';
import { sessionManager } from './modules/session-coordinator.js';
import { getUTCDate } from './modules/utilities.js';

// Helper function to update child labels based on which child is high
function updateChildLabels() {
    const isChild1High = appState.session.high_child === 1;

    // Determine names based on which child is high
    const child1Name = isChild1High ? SCENARIOS_METADATA.child_high_name : SCENARIOS_METADATA.child_low_name;
    const child2Name = isChild1High ? SCENARIOS_METADATA.child_low_name : SCENARIOS_METADATA.child_high_name;

    // Update all child name elements in the UI
    const child1NameElements = document.querySelectorAll('.child1-name, #child1-name');
    const child2NameElements = document.querySelectorAll('.child2-name, #child2-name');

    child1NameElements.forEach(el => {
        el.textContent = child1Name || 'Child 1';
    });
    child2NameElements.forEach(el => {
        el.textContent = child2Name || 'Child 2';
    });
}

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
    // Returns: 1, 2, or null
    getDummyModeFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        const dummyParam = urlParams.get('dummy');

        // Support dummy=1, dummy=2, or legacy dummy=true (treated as dummy=1)
        if (dummyParam === '1' || dummyParam === 'true') {
            return 1;
        } else if (dummyParam === '2') {
            return 2;
        }
        return null;
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
            const dummyMode = this.getDummyModeFromURL();

            // Load scenarios from JSON file - use appropriate dummy file or real scenarios
            let scenariosFile;
            if (dummyMode === 1) {
                scenariosFile = 'scenarios-dummy.json';
            } else if (dummyMode === 2) {
                scenariosFile = 'scenarios-dummy-2.json';
            } else {
                scenariosFile = 'scenarios.json';
            }
            await loadScenarios(scenariosFile);

            // Update the UI with scenarios metadata
            const totalScenariosSpan = document.getElementById('total-scenarios');
            if (totalScenariosSpan) {
                totalScenariosSpan.textContent = SCENARIOS.length;
            }

            // Update infotext from scenarios metadata
            const infotextElement = document.getElementById('scenarios-infotext');
            if (infotextElement && SCENARIOS_METADATA.infotext) {
                infotextElement.innerHTML = SCENARIOS_METADATA.infotext;
            }

            // Update dynamic labels from scenarios metadata
            const outcomeChartTitle = document.getElementById('outcome-chart-title');
            if (outcomeChartTitle && SCENARIOS_METADATA.outcome_chart_title) {
                outcomeChartTitle.textContent = SCENARIOS_METADATA.outcome_chart_title;
            }

            const distributionPrompt = document.getElementById('distribution-prompt');
            if (distributionPrompt && SCENARIOS_METADATA.distribution_prompt) {
                distributionPrompt.textContent = SCENARIOS_METADATA.distribution_prompt;
            }

            const resourceLabel1 = document.getElementById('resource-label-1');
            const resourceLabel2 = document.getElementById('resource-label-2');
            if (resourceLabel1 && SCENARIOS_METADATA.resource_plural) {
                resourceLabel1.textContent = SCENARIOS_METADATA.resource_plural;
            }
            if (resourceLabel2 && SCENARIOS_METADATA.resource_plural) {
                resourceLabel2.textContent = SCENARIOS_METADATA.resource_plural;
            }

            // Note: Child names will be set dynamically based on high_child after scenario loads
            // This happens in updateChildLabels() function called after computeScenarioOutcomes()

            if (!sessionId) {
                throw new Error('No session ID provided in URL. Please access this page from the session manager.');
            }

            // Load session from database
            const session = await this.loadSessionFromDatabase(sessionId);

            // Note: We allow re-doing the slider - existing responses will be overwritten
            // when the slider is completed (saveAllResponses deletes old ones first)

            // Initialize ChartManager with placeholder names (will be updated after scenario loads)
            this.chartManager = new ChartManager('Child 1', 'Child 2');

            // Update app state with real session data and dummy mode flag
            appState.updateSession({
                id: session.id,
                participant_id: session.familyId,
                enumerator_id: session.enumeratorId,
                date_created: session.createdAt || getUTCDate(),
                date_modified: session.sliderStartedAt || getUTCDate(),
                // Pre-earnings are now set per-scenario by computeScenarioOutcomes()
                isDummyMode: dummyMode !== null
            });

            // Initialize UI manager
            uiManager.initialize();

            // Setup chart-UI integration
            this.chartManager.setupUIChartIntegration(uiManager, appState, CONFIG);
            
            // Setup the chart update callback for session manager
            const chartUpdateCallback = () => {
                // Update child labels in case high_child changed (after navigation to new scenario)
                updateChildLabels();

                // Update chart manager child names
                const isChild1High = appState.session.high_child === 1;
                this.chartManager.child1Name = isChild1High ? SCENARIOS_METADATA.child_high_name : SCENARIOS_METADATA.child_low_name;
                this.chartManager.child2Name = isChild1High ? SCENARIOS_METADATA.child_low_name : SCENARIOS_METADATA.child_high_name;

                // Update chart data
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

            // Update child labels based on which child is high for this scenario
            updateChildLabels();

            // Update chart manager with correct child names based on high_child
            const isChild1High = appState.session.high_child === 1;
            this.chartManager.child1Name = isChild1High ? SCENARIOS_METADATA.child_high_name : SCENARIOS_METADATA.child_low_name;
            this.chartManager.child2Name = isChild1High ? SCENARIOS_METADATA.child_low_name : SCENARIOS_METADATA.child_high_name;

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
                        <a href="index.html" class="btn btn-primary me-2">Regresar</a>
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
                    <a href="index.html" class="btn btn-primary">Rregresar</a>
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
function initializeSliderApp() {
    // Small delay to ensure all DOM elements are ready
    setTimeout(async () => {
        const app = new SliderApp();
        globalChartManager = app.chartManager;
        await app.initialize();
    }, CONFIG.DOM_SETUP_DELAY_MS);
}

// Check if DOM is already loaded (common with module scripts which are deferred)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeSliderApp);
} else {
    // DOM is already ready, initialize immediately
    initializeSliderApp();
}

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