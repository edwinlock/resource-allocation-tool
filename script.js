// DOM elements
const allocationSlider = document.getElementById('allocation-slider');
const child1Display = document.getElementById('child1-display');
const child2Display = document.getElementById('child2-display');
const scenarioSelect = document.getElementById('scenario-select');
const scenarioDesc = document.getElementById('scenario-desc');

// Fixed performance values (never change)
const CHILD1_PERFORMANCE = 42;
const CHILD2_PERFORMANCE = 78;

// Scenario configurations
const SCENARIOS = {
    balanced: {
        description: "Equal opportunity for both children with moderate returns on investment. This scenario provides a balanced approach where resources translate to earnings at a steady rate, with diminishing returns setting in around the midpoint of allocation.",
        performanceMultiplier: 1.5,
        earningsMultiplier: 50,
        diminishingPoint: 50,
        diminishingRate: 0.5
    },
    competitive: {
        description: "High rewards for resource allocation, but with steep diminishing returns. This scenario mimics competitive environments where early investment provides significant advantages, but over-investing leads to rapidly decreasing marginal benefits.",
        performanceMultiplier: 2.0,
        earningsMultiplier: 75,
        diminishingPoint: 40,
        diminishingRate: 0.3
    },
    collaborative: {
        description: "Steady, consistent returns with less dramatic peaks and valleys. This approach emphasizes sustainable growth where resources provide moderate but reliable returns, and diminishing returns are less punitive, encouraging more even distribution.",
        performanceMultiplier: 1.2,
        earningsMultiplier: 40,
        diminishingPoint: 60,
        diminishingRate: 0.7
    },
    specialized: {
        description: "Rewards focused investment with higher returns when concentrating resources. This scenario represents specialized skill development where concentrated effort yields exceptional results, but benefits only emerge with substantial resource commitment.",
        performanceMultiplier: 1.8,
        earningsMultiplier: 60,
        diminishingPoint: 70,
        diminishingRate: 0.4
    }
};

function calculateEarnings(allocation, childPerformance, scenario) {
    return Math.round(
        childPerformance * scenario.earningsMultiplier + 
        (allocation * scenario.performanceMultiplier * 10) + 
        (allocation > scenario.diminishingPoint ? 
            (allocation - scenario.diminishingPoint) * scenario.diminishingRate * 50 : 0)
    );
}

function updateDisplay() {
    const allocation1 = parseInt(allocationSlider.value);
    const allocation2 = 100 - allocation1;
    const scenario = SCENARIOS[scenarioSelect.value];
    
    // Update allocation displays
    child1Display.textContent = allocation1;
    child2Display.textContent = allocation2;
    
    // Calculate earnings on the fly
    const earnings1 = calculateEarnings(allocation1, CHILD1_PERFORMANCE, scenario);
    const earnings2 = calculateEarnings(allocation2, CHILD2_PERFORMANCE, scenario);
    const totalEarnings = earnings1 + earnings2;
    
    // Update bar values
    const child1BarValue = document.getElementById('child1-bar-value');
    const child2BarValue = document.getElementById('child2-bar-value');
    const combinedBarValue = document.getElementById('combined-bar-value');
    
    if (child1BarValue) child1BarValue.textContent = `$${earnings1.toLocaleString()}`;
    if (child2BarValue) child2BarValue.textContent = `$${earnings2.toLocaleString()}`;
    if (combinedBarValue) combinedBarValue.textContent = `$${totalEarnings.toLocaleString()}`;
    
    // Update bar heights
    const child1Bar = document.getElementById('child1-bar');
    const child2Bar = document.getElementById('child2-bar');
    const combinedBar = document.getElementById('combined-bar');
    
    // Calculate maximum possible earnings for scaling
    let maxEarnings = 0;
    for (let testAlloc = 0; testAlloc <= 100; testAlloc++) {
        const testEarnings1 = calculateEarnings(testAlloc, CHILD1_PERFORMANCE, scenario);
        const testEarnings2 = calculateEarnings(100 - testAlloc, CHILD2_PERFORMANCE, scenario);
        const testTotal = testEarnings1 + testEarnings2;
        maxEarnings = Math.max(maxEarnings, testEarnings1, testEarnings2, testTotal);
    }
    
    // Scale bars to fit container (300px max height)
    const maxHeight = 300;
    const scale = maxHeight / maxEarnings;
    
    const height1 = Math.max(earnings1 * scale, 20);
    const height2 = Math.max(earnings2 * scale, 20);
    const heightCombined = Math.max(totalEarnings * scale, 20);
    
    if (child1Bar) child1Bar.style.height = `${height1}px`;
    if (child2Bar) child2Bar.style.height = `${height2}px`;
    if (combinedBar) combinedBar.style.height = `${heightCombined}px`;
}

function onSliderChange() {
    updateDisplay();
}

function onScenarioChange() {
    const selectedScenario = scenarioSelect.value;
    scenarioDesc.textContent = SCENARIOS[selectedScenario].description;
    updateDisplay();
}

// Initialize
updateDisplay();

// Add event listeners
allocationSlider.addEventListener('input', onSliderChange);
scenarioSelect.addEventListener('change', onScenarioChange);