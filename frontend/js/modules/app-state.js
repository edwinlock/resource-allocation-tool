import { CONFIG, SCENARIOS } from './constants.js';
import { getUTCDate, shuffleArray } from './utilities.js';
import { computeOutcomes } from './economic-engine.js';

const { ALLOCATABLE_BUDGET } = CONFIG;

class AppState {
    constructor() {
        // Session data - initialized with default values, updated when real session loads
        this.session = {
            id: null,
            participant_id: null,
            enumerator_id: null,
            date_created: getUTCDate(),
            date_modified: getUTCDate(),
            abilityScore1: 50, // Default ability scores
            abilityScore2: 20,
        };

        // Economic calculation results
        this.scenarioData = {
            // allocation of lessons to children due to performance
            preEarnings1: 0,
            preEarnings2: 0,
            // all the choices that the parents can make for child 1 and 2
            investments1: Array(ALLOCATABLE_BUDGET+1).fill(0),
            investments2: Array(ALLOCATABLE_BUDGET+1).fill(0),
            // individual and total allocation of lessons to children for each choice of investment
            postEarnings1: Array(ALLOCATABLE_BUDGET+1).fill(0),
            postEarnings2: Array(ALLOCATABLE_BUDGET+1).fill(0),
            aggrEarnings: Array(ALLOCATABLE_BUDGET+1).fill(0),
            // rounded versions for charts and display
            postEarnings1Rounded: Array(ALLOCATABLE_BUDGET+1).fill(0),
            postEarnings2Rounded: Array(ALLOCATABLE_BUDGET+1).fill(0),
            aggrEarningsRounded: Array(ALLOCATABLE_BUDGET+1).fill(0),
            maximumEarnings: 0,  // upper bound on aggregate earnings across all choices
            maximumEarningsRounded: 0,  // upper bound on rounded aggregate earnings
            alpha: 0,
        };

        // Current UI state
        this.selectedInvestment = 0;
        this.sliderTouched = false;

        // Chart instances
        this.charts = {
            barChart: null,
            lineChart: null,
            multiBarChart: null
        };

        // Session progression state
        this.sliderState = {
            sessionId: null,
            scenarioOrder: null,
            currentIndex: null,
            currentScenarioNumber: null,
            totalScenarios: null,
            responses: null
        };
    }

    // Update scenario data with new economic calculations
    updateScenarioData(newData) {
        Object.assign(this.scenarioData, newData);
    }

    // Compute new scenario outcomes and update state
    computeScenarioOutcomes(scenario) {
        const newData = computeOutcomes(this.session, scenario);
        this.updateScenarioData(newData);
    }

    // Update session data
    updateSession(sessionData) {
        Object.assign(this.session, sessionData);
    }

    // Session progression methods
    initializeSession(sessionId, totalScenarios) {
        // Create shuffled scenario order
        const scenarioNumbers = [...Array(totalScenarios).keys()];
        const shuffledOrder = shuffleArray(scenarioNumbers);

        // Initialize global state properties
        this.sliderState.sessionId = sessionId;
        this.sliderState.scenarioOrder = shuffledOrder;
        this.sliderState.currentIndex = 0;
        this.sliderState.currentScenarioNumber = shuffledOrder[0];
        this.sliderState.totalScenarios = totalScenarios;
        this.sliderState.responses = Array(totalScenarios).fill(null);
    }


    advanceToNextScenario() {
        this.sliderState.currentIndex++;
        if (this.sliderState.currentIndex < this.sliderState.totalScenarios) {
            this.sliderState.currentScenarioNumber = this.sliderState.scenarioOrder[this.sliderState.currentIndex];
        }
    }

    goToPreviousScenario() {
        if (this.sliderState.currentIndex > 0) {
            this.sliderState.currentIndex--;
            this.sliderState.currentScenarioNumber = this.sliderState.scenarioOrder[this.sliderState.currentIndex];
        }
    }

    addResponse(child1investment) {
        const response = {
            scenarioNumber: this.sliderState.currentScenarioNumber,
            displayOrder: this.getCurrentDisplayOrder(),
            child1investment,
            completedAt: getUTCDate()
        };
        
        // Store response at current index
        this.sliderState.responses[this.sliderState.currentIndex] = response;
    }

    getCurrentDisplayOrder() {
        return this.sliderState.currentIndex + 1;
    }

    isLastScenario() {
        return this.sliderState.currentIndex >= this.sliderState.totalScenarios - 1;
    }

    // Navigation business logic for slider app
    async processNextScenario() {
        // Add response to global state
        this.addResponse(this.selectedInvestment);
        
        // Check if this was the last scenario
        if (this.isLastScenario()) {
            // Return completion data for coordinator to handle database operations
            return { 
                completed: true, 
                responses: this.sliderState.responses.filter(r => r !== null)
            };
        } else {
            // Advance to next scenario
            this.advanceToNextScenario();
            
            // Get the new scenario and recalculate outcomes
            const newScenario = SCENARIOS[this.sliderState.currentScenarioNumber];
            this.computeScenarioOutcomes(newScenario);
            
            return { 
                completed: false, 
                newScenario,
                currentIndex: this.sliderState.currentIndex 
            };
        }
    }

    async processPreviousScenario() {
        // Go to previous scenario
        this.goToPreviousScenario();
        
        // Get the previous scenario and recalculate outcomes
        const prevScenario = SCENARIOS[this.sliderState.currentScenarioNumber];
        this.computeScenarioOutcomes(prevScenario);
        
        // Get the saved response if it exists
        const savedResponse = this.sliderState.responses[this.sliderState.currentIndex];
        
        return { 
            prevScenario,
            savedResponse,
            currentIndex: this.sliderState.currentIndex 
        };
    }

    // Application initialization for slider app
    async startSession(totalScenarios = SCENARIOS.length) {
        // Use current session id for initialization
        this.initializeSession(this.session.id, totalScenarios);
        return this.sliderState;
    }

    // Update selected investment
    setSelectedInvestment(value) {
        this.selectedInvestment = value;
    }

    // Slider touch state management
    markSliderTouched() {
        this.sliderTouched = true;
    }

    resetSliderTouched() {
        this.sliderTouched = false;
    }

    // Chart management
    setChart(chartType, chartInstance) {
        this.charts[chartType] = chartInstance;
    }

    getChart(chartType) {
        return this.charts[chartType];
    }

    clearChart(chartType) {
        this.charts[chartType] = null;
    }

    clearAllCharts() {
        this.charts = {
            barChart: null,
            lineChart: null,
            multiBarChart: null
        };
    }
}

// Create and export singleton instance
export const appState = new AppState();