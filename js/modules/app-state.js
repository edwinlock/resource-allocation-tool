import { SCENARIOS, SCENARIOS_METADATA } from './scenario-loader.js';
import { getUTCDate, shuffleArray } from './utilities.js';
import { computeOutcomes } from './economic-engine.js';

class AppState {
    constructor() {
        // Session data - initialized with default values, updated when real session loads
        this.session = {
            id: null,
            participant_id: null,
            enumerator_id: null,
            date_created: getUTCDate(),
            date_modified: getUTCDate(),
            preEarnings1: null, // Will be set per scenario based on coin flip
            preEarnings2: null, // Will be set per scenario based on coin flip
            high_child: null,   // Which child (1 or 2) has higher pre-earnings for current scenario
            isDummyMode: false, // Whether this is a practice round (don't save responses)
        };

        // Economic calculation results
        // Note: These arrays will be properly initialized when computeScenarioOutcomes is called
        // after scenarios are loaded. Using empty arrays as placeholders.
        this.scenarioData = {
            // allocation of lessons to children due to performance
            preEarnings1: 0,
            preEarnings2: 0,
            // all the choices that the parents can make for child 1 and 2
            investments1: [],
            investments2: [],
            // individual and total allocation of lessons to children for each choice of investment
            postEarnings1: [],
            postEarnings2: [],
            aggrEarnings: [],
            // rounded versions for charts and display
            postEarnings1Rounded: [],
            postEarnings2Rounded: [],
            aggrEarningsRounded: [],
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
    computeScenarioOutcomes(scenario, savedHighChild = null) {
        // Determine high_child:
        // - If savedHighChild is provided (going back to previous scenario), use it
        // - Otherwise, flip coin for new scenario using cryptographically secure RNG
        let high_child;
        if (savedHighChild !== null) {
            high_child = savedHighChild;
        } else {
            // Use crypto.getRandomValues() for better randomness
            const randomBuffer = new Uint32Array(1);
            crypto.getRandomValues(randomBuffer);
            // Convert to 0 or 1, then add 1 to get 1 or 2
            high_child = (randomBuffer[0] % 2) + 1;
        }

        // Assign pre-earnings based on high_child
        // scenario.pre_earnings = [high_value, low_value]
        if (high_child === 1) {
            this.session.preEarnings1 = scenario.pre_earnings[0]; // high
            this.session.preEarnings2 = scenario.pre_earnings[1]; // low
        } else {
            this.session.preEarnings1 = scenario.pre_earnings[1]; // low
            this.session.preEarnings2 = scenario.pre_earnings[0]; // high
        }

        this.session.high_child = high_child;

        // Compute economic outcomes with the assigned pre-earnings
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
        // Reset slider to leftmost position (0) for new scenario
        this.selectedInvestment = 0;
        this.sliderTouched = false;
    }

    goToPreviousScenario() {
        if (this.sliderState.currentIndex > 0) {
            this.sliderState.currentIndex--;
            this.sliderState.currentScenarioNumber = this.sliderState.scenarioOrder[this.sliderState.currentIndex];
        }
    }

    addResponse(child1investment) {
        // Get current scenario to extract parameters
        const currentScenario = SCENARIOS[this.sliderState.currentScenarioNumber];

        // Get computed economic values from scenarioData
        // All arrays are indexed by child1investment (child2 gets ALLOCATABLE_BUDGET - child1investment)
        const child1_final_earnings = this.scenarioData.postEarnings1Rounded[child1investment];
        const child2_final_earnings = this.scenarioData.postEarnings2Rounded[child1investment];
        const aggregate_final_earnings = this.scenarioData.aggrEarningsRounded[child1investment];

        const allocatableBudget = SCENARIOS_METADATA.allocatable_budget;
        const child2investment = allocatableBudget - child1investment;

        const response = {
            scenariosId: SCENARIOS_METADATA.scenarios_id,  // Include scenarios_id from metadata
            scenarioNumber: this.sliderState.currentScenarioNumber,
            scenarioName: currentScenario.name,  // Store scenario name (id) instead of index
            displayOrder: this.getCurrentDisplayOrder(),
            child1investment,
            child2investment,
            allocatableBudget,
            highChild: this.session.high_child,  // Which child (1 or 2) has higher pre-earnings
            completedAt: getUTCDate(),

            // Scenario parameters
            scenarioGamma: currentScenario.gamma,
            scenarioSigma: currentScenario.sigma,
            scenarioTheta: currentScenario.theta,

            // Session-specific inputs
            preEarnings1: this.session.preEarnings1,
            preEarnings2: this.session.preEarnings2,

            // Computed economic values
            scenarioAlpha: this.scenarioData.alpha,
            child1FinalEarnings: child1_final_earnings,
            child2FinalEarnings: child2_final_earnings,
            aggregateFinalEarnings: aggregate_final_earnings
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

        // Get the saved response if it exists
        const savedResponse = this.sliderState.responses[this.sliderState.currentIndex];

        // Get the previous scenario and recalculate outcomes
        const prevScenario = SCENARIOS[this.sliderState.currentScenarioNumber];

        // If we have a saved response, restore the saved high_child value
        // Otherwise flip a new coin (shouldn't happen, but safe fallback)
        const savedHighChild = savedResponse ? savedResponse.highChild : null;
        this.computeScenarioOutcomes(prevScenario, savedHighChild);

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