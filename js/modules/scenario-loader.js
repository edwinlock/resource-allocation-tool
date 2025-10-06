// Scenario Loader - Loads scenarios from JSON configuration file
// This allows scenarios to be configured without code changes

let SCENARIOS = [];

/**
 * Load scenarios from JSON file
 * @returns {Promise<Array>} Array of scenario objects
 */
async function loadScenarios() {
    try {
        const response = await fetch('scenarios/scenarios.json');
        if (!response.ok) {
            throw new Error(`Failed to load scenarios: ${response.status} ${response.statusText}`);
        }
        const scenarios = await response.json();

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

        SCENARIOS = scenarios;
        return scenarios;
    } catch (error) {
        console.error('Error loading scenarios:', error);
        throw error;
    }
}

export { SCENARIOS, loadScenarios };
