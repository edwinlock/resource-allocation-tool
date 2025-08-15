// Main application entry point - modularized slider application
import { CONFIG, SCENARIOS } from './modules/constants.js';
import { appState } from './modules/app-state.js';
import { ChartManager } from './modules/chart-factory.js';
import { uiManager } from './modules/ui-manager.js';
import { sessionManager, SessionApp } from './modules/session-manager.js';

// Application initialization
class SliderApp {
    constructor() {
        this.chartManager = new ChartManager();
    }

    async initialize() {
        try {
            console.log('Initializing modular slider application...');
            
            // Initialize UI manager
            uiManager.initialize();
            
            // Setup chart-UI integration
            this.chartManager.setupUIChartIntegration(uiManager, appState, CONFIG);
            
            // Setup the chart update callback for session manager
            const chartUpdateCallback = () => {
                this.chartManager.updateChartData(appState, CONFIG);
            };
            
            // Initialize session management (this will randomize scenario order)
            await sessionManager.startSession(SCENARIOS.length, uiManager, chartUpdateCallback);
            
            // Now compute outcomes for the first randomized scenario
            const currentScenario = SCENARIOS[appState.sliderState.currentScenarioNumber];
            appState.computeScenarioOutcomes(currentScenario);
            
            // Create charts with proper scenario data
            this.chartManager.createAllCharts(uiManager, appState);
            
            // Update UI displays and chart visibility
            uiManager.updateDebugDisplay();
            uiManager.updateScenarioDropdown();
            uiManager.updateChartVisibility();
            
            console.log('Charts created and initialized with randomized scenario:', currentScenario.name);
            
            console.log('Modular slider application initialized successfully');
        } catch (error) {
            console.error('Error initializing slider application:', error);
            console.error('Error details:', error.message);
            console.error('Error stack:', error.stack);
            alert('Error initializing application: ' + error.message + '. Check console for details. Please refresh and try again.');
        }
    }
}

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, starting modular slider app...');
    
    // Small delay to ensure all DOM elements are ready
    setTimeout(async () => {
        const app = new SliderApp();
        await app.initialize();
    }, 100);
});

// Export for global access (compatibility)
window.SessionApp = SessionApp;