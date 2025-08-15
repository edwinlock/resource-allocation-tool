import { CONFIG } from './constants.js';
import { getUTCDate, shuffleArray } from './utilities.js';
import { computeOutcomes } from './economic-engine.js';

const { ALLOCATABLE_BUDGET } = CONFIG;

class AppState {
    constructor() {
        // Dummy session data (for now)
        this.session = {
            id: "b9f47f2fbb5a1aca",
            participant_id: "ca6adb86ade03ed2",
            enumerator_id: "31af862fd42f96c7",
            date_created: getUTCDate(),
            date_modified: getUTCDate(),
            abilityScore1: 5,
            abilityScore2: 1,
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

    // Update selected investment
    setSelectedInvestment(value) {
        this.selectedInvestment = value;
    }

    // Chart management
    setChart(chartType, chartInstance) {
        this.charts[chartType] = chartInstance;
    }

    getChart(chartType) {
        return this.charts[chartType];
    }
}

// Create and export singleton instance
export const appState = new AppState();