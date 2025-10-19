// Scenario Loader - Loads scenarios from JSON configuration file
// This allows scenarios to be configured without code changes

let SCENARIOS = [];
let SCENARIOS_METADATA = {
    scenarios_id: null,
    infotext: null,
    child1_name: null,
    child2_name: null,
    allocatable_budget: null,
    max_sessions: null
};

/**
 * Load scenarios from JSON file
 * @param {string} filename - Name of the scenarios file (default: 'scenarios.json')
 * @returns {Promise<Object>} Object containing scenarios array and metadata
 */
async function loadScenarios(filename = 'scenarios.json') {
    try {
        const response = await fetch(`scenarios/${filename}`);
        if (!response.ok) {
            throw new Error(`Failed to load scenarios: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();

        // Validate top-level structure
        if (!data.scenarios_id || !data.infotext || !data.scenarios) {
            throw new Error('Scenarios file must contain scenarios_id, infotext, and scenarios');
        }

        const scenarios = data.scenarios;

        // Validate scenarios
        if (!Array.isArray(scenarios)) {
            throw new Error('Scenarios must be an array');
        }

        if (scenarios.length === 0) {
            throw new Error('Scenarios array is empty');
        }

        // Validate each scenario has required fields
        scenarios.forEach((scenario, index) => {
            if (!scenario.name || scenario.gamma === undefined ||
                scenario.sigma === undefined || scenario.theta === undefined) {
                throw new Error(`Scenario ${index} is missing required fields (name, gamma, sigma, theta)`);
            }
        });

        // Store scenarios and metadata
        SCENARIOS = scenarios;
        SCENARIOS_METADATA = {
            scenarios_id: data.scenarios_id,
            infotext: data.infotext,
            child1_name: data.child1_name || 'Child 1',  // Default fallback
            child2_name: data.child2_name || 'Child 2',   // Default fallback
            allocatable_budget: data.allocatable_budget,
            max_sessions: data.max_sessions
        };

        return { scenarios, metadata: SCENARIOS_METADATA };
    } catch (error) {
        console.error('Error loading scenarios:', error);
        throw error;
    }
}

export { SCENARIOS, SCENARIOS_METADATA, loadScenarios };
