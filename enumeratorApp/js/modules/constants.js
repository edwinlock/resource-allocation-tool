// Application Configuration Constants
export const CONFIG = {
    ALLOCATABLE_BUDGET: 9,
    GAP_THRESHOLD: 6,
    MAX_SESSIONS: 15
};

// Chart Colors - colorblind-friendly matplotlib-style palette
export const COLORS = {
    CHILD1_COLOR: '#1f77b4',        // Matplotlib blue border
    CHILD1_BG_COLOR: '#aecbea',     // Light blue background
    CHILD1_DARK_COLOR: '#0f4c75',   // Dark blue for highlighting/text
    CHILD2_COLOR: '#ff7f0e',        // Matplotlib orange border
    CHILD2_BG_COLOR: '#ffc788',     // Light orange background
    CHILD2_DARK_COLOR: '#cc5500',   // Dark orange for highlighting/text
    COMBINED_COLOR: '#2ca02c',      // Matplotlib green border
    COMBINED_BG_COLOR: '#a8d4a8',   // Light green background
    LABEL_BG_COLOR: 'rgba(255, 255, 255, 0.9)',  // Semi-transparent white for labels
    LABEL_BORDER_COLOR: '#ccc'      // Light gray for label borders
};

// Scenario Configurations
// We have a total of 8 scenarios:
// gamma = 0.5 always
// sigma is 1 (additive), 0.5 (CES), 0 (Cobb-Douglas) or -2 (CES)
// theta is 1 or 2
export const SCENARIOS = [
    {
        name: "A",
        description: "σ=1, θ=1",
        gamma: 0.5,
        sigma: 1,
        theta: 1,
    },
    {
        name: "B", 
        description: "σ=1, θ=2",
        gamma: 0.5,
        sigma: 1,
        theta: 2,
    },
    {
        name: "C",
        description: "σ=0.5, θ=1", 
        gamma: 0.5,
        sigma: 0.5,
        theta: 1,
    },
    {
        name: "D",
        description: "σ=0.5, θ=2",
        gamma: 0.5,
        sigma: 0.5,
        theta: 2,
    },
    {
        name: "E",
        description: "σ=0, θ=1",
        gamma: 0.5,
        sigma: 0,
        theta: 1,
    },
    {
        name: "F",
        description: "σ=0, θ=2", 
        gamma: 0.5,
        sigma: 0,
        theta: 2,
    },
    {
        name: "G",
        description: "σ=-2, θ=1",
        gamma: 0.5,
        sigma: -2,
        theta: 1,
    },
    {
        name: "H",
        description: "σ=-2, θ=2",
        gamma: 0.5,
        sigma: -2,
        theta: 2,
    },
];

