// Scenario Loader - Loads scenarios from JSON configuration file
// This allows scenarios to be configured without code changes

let SCENARIOS = [];
let SCENARIOS_METADATA = {
    scenarios_id: null,
    infotext: null,
    child_high_name: null,
    child_low_name: null,
    resource_plural: null,
    allocation_label: null,
    outcome_chart_title: null,
    distribution_prompt: null,
    allocatable_budget: null,
    max_sessions: null,
    child_high_color: null,
    child_high_bg_color: null,
    child_high_dark_color: null,
    child_low_color: null,
    child_low_bg_color: null,
    child_low_dark_color: null,
    combined_color: null,
    combined_bg_color: null,
    label_bg_color: null,
    label_border_color: null
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

            // Validate pre_earnings array
            if (!scenario.pre_earnings || !Array.isArray(scenario.pre_earnings) || scenario.pre_earnings.length !== 2) {
                throw new Error(`Scenario ${index} must have pre_earnings array with exactly 2 numbers [high, low]`);
            }

            // Validate pre_earnings values are numbers
            if (typeof scenario.pre_earnings[0] !== 'number' || typeof scenario.pre_earnings[1] !== 'number') {
                throw new Error(`Scenario ${index} pre_earnings must contain numbers, got [${typeof scenario.pre_earnings[0]}, ${typeof scenario.pre_earnings[1]}]`);
            }

            // Validate pre_earnings values are positive
            if (scenario.pre_earnings[0] <= 0 || scenario.pre_earnings[1] <= 0) {
                throw new Error(`Scenario ${index} pre_earnings must be positive numbers, got [${scenario.pre_earnings[0]}, ${scenario.pre_earnings[1]}]`);
            }

            // Validate first value (high) is greater than second value (low)
            if (scenario.pre_earnings[0] <= scenario.pre_earnings[1]) {
                throw new Error(`Scenario ${index} pre_earnings[0] (high) must be greater than pre_earnings[1] (low), got [${scenario.pre_earnings[0]}, ${scenario.pre_earnings[1]}]`);
            }
        });

        // Store scenarios and metadata
        SCENARIOS = scenarios;
        SCENARIOS_METADATA = {
            scenarios_id: data.scenarios_id,
            infotext: data.infotext,
            child_high_name: data.child_high_name,
            child_low_name: data.child_low_name,
            resource_plural: data.resource_plural,
            allocation_label: data.allocation_label,
            outcome_chart_title: data.outcome_chart_title,
            distribution_prompt: data.distribution_prompt,
            allocatable_budget: data.allocatable_budget,
            max_sessions: data.max_sessions,
            child_high_color: data.child_high_color,
            child_high_bg_color: data.child_high_bg_color,
            child_high_dark_color: data.child_high_dark_color,
            child_low_color: data.child_low_color,
            child_low_bg_color: data.child_low_bg_color,
            child_low_dark_color: data.child_low_dark_color,
            combined_color: data.combined_color,
            combined_bg_color: data.combined_bg_color,
            label_bg_color: data.label_bg_color,
            label_border_color: data.label_border_color
        };

        return { scenarios, metadata: SCENARIOS_METADATA };
    } catch (error) {
        console.error('Error loading scenarios:', error);
        throw error;
    }
}

export { SCENARIOS, SCENARIOS_METADATA, loadScenarios };
