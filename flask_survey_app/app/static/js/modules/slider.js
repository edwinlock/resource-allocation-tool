// Global constants
const ALLOCATABLE_BUDGET = 9
const GAP_THRESHOLD = 6
const MAX_SESSIONS = 15

// DOM elements
// For development purposes
const child1Ability = document.getElementById('child1-ability')
const child2Ability = document.getElementById('child2-ability')
// Permanent
const investmentSlider = document.getElementById('investment-slider');
const child1Display = document.getElementById('child1-display');
const child2Display = document.getElementById('child2-display');
const scenarioSelect = document.getElementById('scenario-select');
const scenarioDesc = document.getElementById('scenario-desc');
const child1Bar = document.getElementById('child1-bar');
const child2Bar = document.getElementById('child2-bar');
const child1BarValue = document.getElementById('child1-bar-value');
const child2BarValue = document.getElementById('child2-bar-value');
const ctx = document.getElementById('single-bar-chart-canvas');
const lineCtx = document.getElementById('line-chart-canvas');
const multiBarCtx = document.getElementById('multi-bar-chart-canvas');
const graphTypeSelect = document.getElementById('graph-type-select');
// Debug elements
const debugPre1 = document.getElementById('debug-pre1');
const debugPre2 = document.getElementById('debug-pre2');
const debugSelected = document.getElementById('debug-selected');
const debugMax = document.getElementById('debug-max');
const debugPost1 = document.getElementById('debug-post1');
const debugPost2 = document.getElementById('debug-post2');
const debugTotal = document.getElementById('debug-total');
let barChart = null;
let lineChart = null;
let multiBarChart = null;

const session = {
    ability1: 5,
    ability2: 1,
}

// Scenario configurations
// We have a total of 8 scenarios:
// gamma = 0.5 always
// sigma is 1 (additive), 0.5 (CES), 0 (Cobb-Douglas) or -2 (CES)
// theta is 1 or 2
const SCENARIOS = [
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
]

const outcomes = {
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
    selectedInvestment: 0,
}

// Mapping ability scores to 'performance ratios':
// Raw scores are between 0 and 100
// There are two kinds of gap: *medium* and *large*
// need to distinguish between child 1 being better than child 2 and vice versa

function computePreEarnings(ability1, ability2) {
    let gap = ability1 - ability2;
    console.log(gap)
    if (gap > GAP_THRESHOLD) {  // child1 is much better
        return [6, 1];
    } else if (gap >= 0 && gap <= GAP_THRESHOLD) { // child1 is slightly better
        return [5, 2];
    } else if (gap >= -GAP_THRESHOLD && gap < 0) { // child2 is slightly better
        return [2, 5];
    } else { // child2 is much better
        return [1, 6];
    }
}

function compute_alpha(ability1, ability2, scenario) {
    const amax = Math.max(ability1, ability2)
    alpha = MAX_SESSIONS * human_capital(amax, ALLOCATABLE_BUDGET, scenario)**(-scenario.theta)
}


function compute_outcomes(session, scenario) {
    const pre = computePreEarnings(session.ability1, session.ability2);
    outcomes.preEarnings1 = pre[0];
    outcomes.preEarnings2 = pre[1];
    for (let i=0; i <= ALLOCATABLE_BUDGET; i++) {
        outcomes.investments1[i] = i;
        outcomes.investments2[i] = ALLOCATABLE_BUDGET - i;
        outcomes.postEarnings1[i] = outcomes.preEarnings1 + 
                                    earnings(session.ability1, outcomes.investments1[i], scenario);
        outcomes.postEarnings2[i] = outcomes.preEarnings2 + 
                                    earnings(session.ability2, outcomes.investments2[i], scenario);
        outcomes.aggrEarnings[i] = outcomes.postEarnings1[i] + outcomes.postEarnings2[i];
        
        // Calculate rounded versions
        outcomes.postEarnings1Rounded[i] = Math.round(outcomes.postEarnings1[i]);
        outcomes.postEarnings2Rounded[i] = Math.round(outcomes.postEarnings2[i]);
        outcomes.aggrEarningsRounded[i] = outcomes.postEarnings1Rounded[i] + outcomes.postEarnings2Rounded[i];
    }
    outcomes.maximumEarnings = Math.max(...outcomes.aggrEarnings);
    outcomes.maximumEarningsRounded = Math.max(...outcomes.aggrEarningsRounded);
    console.log(outcomes)
}

// Compute child-specific human capital, as a combination of ability and parental investment
function human_capital(ability, investment, scenario) {
    // define local constants, for readibility
    const a = ability
    const x = investment
    const sigma = scenario.sigma
    const gamma = scenario.gamma
    if (sigma == 0) {
        return a**gamma * x**(1-gamma)
    } else {
        return (gamma * a**sigma + (1-gamma) * x**sigma)**(1/sigma)
    }
}

// Compute earnings for specific investment using the human capital function and scenario parameter theta
function earnings(ability, investment, scenario) {
    return human_capital(ability, investment, scenario)**scenario.theta
}

function onSliderChange() {
    const i = parseInt(investmentSlider.value);
    outcomes.selectedInvestment = i;
    // Update investment labels
    child1Display.textContent = i;
    child2Display.textContent = ALLOCATABLE_BUDGET - i;
    // Update Chart.js chart
    updateChartData();
    updateDebugDisplay();
}

function onScenarioChange() {
    const selectedScenarioIndex = parseInt(scenarioSelect.value);
    const selectedScenario = SCENARIOS[selectedScenarioIndex];
    compute_outcomes(session, selectedScenario);
    // Update Chart.js chart
    updateChartData();
    updateDebugDisplay();
}

function updateChartVisibility() {
    const selectedType = graphTypeSelect.value;
    
    // Hide all charts first
    ctx.style.display = 'none';
    lineCtx.style.display = 'none';
    multiBarCtx.style.display = 'none';
    
    // Show only the selected chart
    switch(selectedType) {
        case 'single-bar':
            ctx.style.display = 'block';
            break;
        case 'multi-bar':
            multiBarCtx.style.display = 'block';
            break;
        case 'line-chart':
            lineCtx.style.display = 'block';
            break;
    }
}

function onGraphTypeChange() {
    updateChartVisibility();
}

function updateDebugDisplay() {
    debugPre1.textContent = outcomes.preEarnings1;
    debugPre2.textContent = outcomes.preEarnings2;
    debugSelected.textContent = outcomes.selectedInvestment;
    debugMax.textContent = outcomes.maximumEarnings.toFixed(1);
    
    // Update table cells
    for (let i = 0; i <= ALLOCATABLE_BUDGET; i++) {
        document.getElementById(`debug-post1-${i}`).textContent = outcomes.postEarnings1[i].toFixed(1);
        document.getElementById(`debug-post2-${i}`).textContent = outcomes.postEarnings2[i].toFixed(1);
        document.getElementById(`debug-total-${i}`).textContent = outcomes.aggrEarnings[i].toFixed(1);
        document.getElementById(`debug-post1r-${i}`).textContent = outcomes.postEarnings1Rounded[i];
        document.getElementById(`debug-post2r-${i}`).textContent = outcomes.postEarnings2Rounded[i];
    }
}

function onAbilityChange() {
    let ability1 = parseInt(child1Ability.value);
    let ability2 = parseInt(child2Ability.value);
    
    // Validate ability1
    if (isNaN(ability1) || ability1 < 0 || ability1 > 100) {
        child1Ability.setCustomValidity('Please enter a number between 0 and 100');
        child1Ability.reportValidity();
        return;
    } else {
        child1Ability.setCustomValidity('');
    }
    
    // Validate ability2
    if (isNaN(ability2) || ability2 < 0 || ability2 > 100) {
        child2Ability.setCustomValidity('Please enter a number between 0 and 100');
        child2Ability.reportValidity();
        return;
    } else {
        child2Ability.setCustomValidity('');
    }
    
    // Only update if both values are valid
    session.ability1 = ability1;
    session.ability2 = ability2;
    const scenario = SCENARIOS[parseInt(scenarioSelect.value)];
    compute_outcomes(session, scenario);
    updateChartData();
    updateDebugDisplay();
}

function updateScenarioOptions() {
    scenarioSelect.innerHTML = '';
    
    for (let i = 0; i < SCENARIOS.length; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = `${SCENARIOS[i].name} (σ=${SCENARIOS[i].sigma}, θ=${SCENARIOS[i].theta})`;
        scenarioSelect.appendChild(option);
    }
    
    if (scenarioSelect.options.length > 0) {
        scenarioSelect.value = 0;
        onScenarioChange();
    }
}


function create_single_bar_chart() {
    barChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Child 1', 'Child 2', 'Combined'],
            datasets: [{
                label: 'Earnings',
                data: [0, 0, 0],
                backgroundColor: ['#a8e6cf', '#ffd3a5', '#c7ceea'],
                borderColor: ['#81c784', '#ffb74d', '#9575cd'],
                borderWidth: 4,
                barPercentage: 0.5,
                categoryPercentage: 1
            }]
        },
        options: {
            animation: {
                duration: 400,
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    enabled: false
                },
                datalabels: {
                    display: true,
                    anchor: 'end',
                    align: 'end',
                    offset: 0,
                    formatter: (value) => value.toLocaleString(),
                    font: {
                        weight: 'bold',
                        size: 12
                    },
                    color: '#333'
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        display: true
                    },
                    border: {
                        display: false
                    }
                },
                y: {
                    display: false,
                    grid: {
                        display: false
                    },
                    beginAtZero: true,
                    max: outcomes.maximumEarningsRounded
                }
            },
            layout: {
                padding: {
                    top: 0,
                    bottom: 10,
                }
            }
        }
    });
}

function create_line_chart() {
    lineChart = new Chart(lineCtx, {
        type: 'line',
        data: {
            labels: Array.from({length: ALLOCATABLE_BUDGET + 1}, (_, i) => i),
            datasets: [
                {
                    label: 'Child 1',
                    data: outcomes.postEarnings1Rounded,
                    borderColor: '#81c784',
                    backgroundColor: '#a8e6cf',
                    borderWidth: 3,
                    tension: 0.1,
                    pointRadius: Array(ALLOCATABLE_BUDGET + 1).fill(4),
                    pointHoverRadius: Array(ALLOCATABLE_BUDGET + 1).fill(6),
                    pointBackgroundColor: Array(ALLOCATABLE_BUDGET + 1).fill('#81c784'),
                    pointBorderColor: Array(ALLOCATABLE_BUDGET + 1).fill('#ffffff'),
                    pointBorderWidth: Array(ALLOCATABLE_BUDGET + 1).fill(2)
                },
                {
                    label: 'Child 2', 
                    data: outcomes.postEarnings2Rounded,
                    borderColor: '#ffb74d',
                    backgroundColor: '#ffd3a5',
                    borderWidth: 3,
                    tension: 0.1,
                    pointRadius: Array(ALLOCATABLE_BUDGET + 1).fill(4),
                    pointHoverRadius: Array(ALLOCATABLE_BUDGET + 1).fill(6),
                    pointBackgroundColor: Array(ALLOCATABLE_BUDGET + 1).fill('#ffb74d'),
                    pointBorderColor: Array(ALLOCATABLE_BUDGET + 1).fill('#ffffff'),
                    pointBorderWidth: Array(ALLOCATABLE_BUDGET + 1).fill(2)
                },
                {
                    label: 'Combined',
                    data: outcomes.aggrEarningsRounded,
                    borderColor: '#9575cd',
                    backgroundColor: '#c7ceea',
                    borderWidth: 3,
                    tension: 0.1,
                    pointRadius: Array(ALLOCATABLE_BUDGET + 1).fill(4),
                    pointHoverRadius: Array(ALLOCATABLE_BUDGET + 1).fill(6),
                    pointBackgroundColor: Array(ALLOCATABLE_BUDGET + 1).fill('#9575cd'),
                    pointBorderColor: Array(ALLOCATABLE_BUDGET + 1).fill('#ffffff'),
                    pointBorderWidth: Array(ALLOCATABLE_BUDGET + 1).fill(2)
                }
            ]
        },
        options: {
            animation: {
                duration: 400,
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                tooltip: {
                    enabled: false
                },
                datalabels: {
                    display: function(context) {
                        // Only show labels for the highlighted point
                        return context.dataIndex === outcomes.selectedInvestment;
                    },
                    anchor: function(context) {
                        const selectedIndex = outcomes.selectedInvestment;
                        const datasetIndex = context.datasetIndex;
                        
                        // Get values at selected point for all datasets
                        const child1Value = outcomes.postEarnings1Rounded[selectedIndex];
                        const child2Value = outcomes.postEarnings2Rounded[selectedIndex];
                        const combinedValue = outcomes.aggrEarningsRounded[selectedIndex];
                        
                        // Sort by value to determine positioning
                        const values = [
                            { dataset: 0, value: child1Value },
                            { dataset: 1, value: child2Value },
                            { dataset: 2, value: combinedValue }
                        ].sort((a, b) => b.value - a.value);
                        
                        // Find this dataset's rank (0 = highest, 1 = middle, 2 = lowest)
                        const rank = values.findIndex(item => item.dataset === datasetIndex);
                        
                        // Position based on rank to avoid overlaps
                        if (rank === 0) return 'end';      // Highest value: top
                        if (rank === 1) return 'center';   // Middle value: center/side  
                        return 'start';                     // Lowest value: bottom
                    },
                    align: function(context) {
                        const selectedIndex = outcomes.selectedInvestment;
                        const datasetIndex = context.datasetIndex;
                        
                        // Get values at selected point for all datasets
                        const child1Value = outcomes.postEarnings1Rounded[selectedIndex];
                        const child2Value = outcomes.postEarnings2Rounded[selectedIndex];
                        const combinedValue = outcomes.aggrEarningsRounded[selectedIndex];
                        
                        // Sort by value to determine positioning
                        const values = [
                            { dataset: 0, value: child1Value },
                            { dataset: 1, value: child2Value },
                            { dataset: 2, value: combinedValue }
                        ].sort((a, b) => b.value - a.value);
                        
                        const rank = values.findIndex(item => item.dataset === datasetIndex);
                        
                        // Position labels to avoid overlap
                        if (rank === 0) return 'top';      // Highest: above
                        if (rank === 1) return 'right';    // Middle: to the right
                        return 'bottom';                    // Lowest: below
                    },
                    offset: 10,
                    formatter: (value) => value.toLocaleString(),
                    font: {
                        weight: 'bold',
                        size: 11
                    },
                    color: '#333',
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    borderColor: '#ccc',
                    borderWidth: 1,
                    borderRadius: 4,
                    padding: 4
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Investment into Child 1'
                    },
                    grid: {
                        display: true,
                        color: '#f0f0f0'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Earnings'
                    },
                    grid: {
                        display: true,
                        color: '#f0f0f0'
                    },
                    beginAtZero: true,
                    max: outcomes.maximumEarningsRounded * 1.1
                }
            },
            layout: {
                padding: {
                    top: 10,
                    bottom: 10,
                    left: 50,
                    right: 50,
                }
            }
        }
    });
}

function create_multi_bar_chart() {
    multiBarChart = new Chart(multiBarCtx, {
        type: 'bar',
        data: {
            labels: Array.from({length: ALLOCATABLE_BUDGET + 1}, (_, i) => i),
            datasets: [
                {
                    label: 'Child 1',
                    data: outcomes.postEarnings1Rounded,
                    backgroundColor: Array(ALLOCATABLE_BUDGET + 1).fill('#a8e6cf'),
                    borderColor: Array(ALLOCATABLE_BUDGET + 1).fill('#81c784'),
                    borderWidth: Array(ALLOCATABLE_BUDGET + 1).fill(4),
                    barPercentage: 0.8,
                    categoryPercentage: 0.9
                },
                {
                    label: 'Child 2',
                    data: outcomes.postEarnings2Rounded,
                    backgroundColor: Array(ALLOCATABLE_BUDGET + 1).fill('#ffd3a5'),
                    borderColor: Array(ALLOCATABLE_BUDGET + 1).fill('#ffb74d'),
                    borderWidth: Array(ALLOCATABLE_BUDGET + 1).fill(4),
                    barPercentage: 0.8,
                    categoryPercentage: 0.9
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            animation: {
                duration: 400,
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        generateLabels: function(chart) {
                            // Force legend to always show original colors, not highlighted ones
                            return [{
                                text: 'Child 1',
                                fillStyle: '#a8e6cf',
                                strokeStyle: '#81c784',
                                lineWidth: 4,
                                datasetIndex: 0
                            }, {
                                text: 'Child 2', 
                                fillStyle: '#ffd3a5',
                                strokeStyle: '#ffb74d',
                                lineWidth: 4,
                                datasetIndex: 1
                            }];
                        }
                    }
                },
                tooltip: {
                    enabled: false
                },
                datalabels: {
                    display: function(context) {
                        // Only show labels for the highlighted bar
                        return context.dataIndex === outcomes.selectedInvestment;
                    },
                    anchor: function(context) {
                        // Child 1 (dataset 0) label goes above, Child 2 (dataset 1) goes below
                        return context.datasetIndex === 0 ? 'end' : 'start';
                    },
                    align: function(context) {
                        // Child 1 above the bar, Child 2 below the bar
                        return context.datasetIndex === 0 ? 'top' : 'bottom';
                    },
                    offset: 8,
                    formatter: (value) => value.toLocaleString(),
                    font: {
                        weight: 'bold',
                        size: 11
                    },
                    color: function(context) {
                        // Darker text colors to match the border colors
                        return context.datasetIndex === 0 ? '#2e7d32' : '#e65100';
                    },
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    borderColor: function(context) {
                        return context.datasetIndex === 0 ? '#2e7d32' : '#e65100';
                    },
                    borderWidth: 1,
                    borderRadius: 4,
                    padding: 4
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Investment into Child 1'
                    },
                    grid: {
                        display: false
                    },
                    stacked: true
                },
                y: {
                    title: {
                        display: true,
                        text: 'Earnings'
                    },
                    grid: {
                        display: false
                    },
                    beginAtZero: true,
                    max: outcomes.maximumEarningsRounded * 1.1,
                    stacked: true
                }
            },
            layout: {
                padding: {
                    top: 10,
                    bottom: 10,
                    left: 20,
                    right: 20
                }
            }
        }
    });
}

function updateLineChartData() {
    if (lineChart) {
        const selectedIndex = outcomes.selectedInvestment;
        
        // Update all data arrays
        lineChart.data.datasets[0].data = [...outcomes.postEarnings1Rounded];
        lineChart.data.datasets[1].data = [...outcomes.postEarnings2Rounded];
        lineChart.data.datasets[2].data = [...outcomes.aggrEarningsRounded];
        
        // Reset all points to normal size and style
        const normalRadius = Array(ALLOCATABLE_BUDGET + 1).fill(4);
        const normalBorderWidth = Array(ALLOCATABLE_BUDGET + 1).fill(2);
        
        // Highlight the selected point
        const highlightedRadius = [...normalRadius];
        const highlightedBorderWidth = [...normalBorderWidth];
        
        highlightedRadius[selectedIndex] = 8;
        highlightedBorderWidth[selectedIndex] = 4;
        
        // Apply highlighting to all datasets
        lineChart.data.datasets.forEach((dataset, datasetIndex) => {
            dataset.pointRadius = [...highlightedRadius];
            dataset.pointBorderWidth = [...highlightedBorderWidth];
            
            // Make highlighted points have a white border for better visibility
            const borderColors = Array(ALLOCATABLE_BUDGET + 1).fill('#ffffff');
            borderColors[selectedIndex] = '#000000'; // Black border for highlighted point
            dataset.pointBorderColor = borderColors;
        });
        
        // Update y-axis max
        lineChart.options.scales.y.max = outcomes.maximumEarningsRounded * 1.1;
        
        lineChart.update();
    }
}

function updateChartData() {
    if (barChart) {
        const i = outcomes.selectedInvestment;
        const earnings1 = outcomes.postEarnings1Rounded[i];
        const earnings2 = outcomes.postEarnings2Rounded[i];
        const totalEarnings = outcomes.aggrEarningsRounded[i];
        
        // Update data
        barChart.data.datasets[0].data = [earnings1, earnings2, totalEarnings];
        
        // Update y-axis max to current maximum earnings with 10% buffer
        barChart.options.scales.y.max = outcomes.maximumEarningsRounded * 1.1;
        
        barChart.update();
    }
    
    // Also update line chart and multi-bar chart
    updateLineChartData();
    updateMultiBarChartData();
}

function updateMultiBarChartData() {
    if (multiBarChart) {
        const selectedIndex = outcomes.selectedInvestment;
        
        // Update data arrays
        multiBarChart.data.datasets[0].data = [...outcomes.postEarnings1Rounded];
        multiBarChart.data.datasets[1].data = [...outcomes.postEarnings2Rounded];
        
        // Create arrays with normal styling for all bars
        const backgroundColors1 = Array(ALLOCATABLE_BUDGET + 1).fill('#a8e6cf');
        const backgroundColors2 = Array(ALLOCATABLE_BUDGET + 1).fill('#ffd3a5');
        const borderColors1 = Array(ALLOCATABLE_BUDGET + 1).fill('#81c784');
        const borderColors2 = Array(ALLOCATABLE_BUDGET + 1).fill('#ffb74d');
        const borderWidths = Array(ALLOCATABLE_BUDGET + 1).fill(4);
        
        // Only highlight the selected bar (not index 0 which affects legend)
        if (selectedIndex > 0 || selectedIndex === 0) {
            // Make selected bar more prominent
            backgroundColors1[selectedIndex] = '#81c784';  // Darker green
            backgroundColors2[selectedIndex] = '#ffb74d';  // Darker peach
            borderColors1[selectedIndex] = '#2e7d32';      // Very dark green border
            borderColors2[selectedIndex] = '#e65100';      // Very dark orange border
            borderWidths[selectedIndex] = 6;               // Thicker border
        }
        
        // Apply styling to datasets
        multiBarChart.data.datasets[0].backgroundColor = backgroundColors1;
        multiBarChart.data.datasets[0].borderColor = borderColors1;
        multiBarChart.data.datasets[0].borderWidth = borderWidths;
        
        multiBarChart.data.datasets[1].backgroundColor = backgroundColors2;
        multiBarChart.data.datasets[1].borderColor = borderColors2;
        multiBarChart.data.datasets[1].borderWidth = borderWidths;
        
        // Update y-axis max
        multiBarChart.options.scales.y.max = outcomes.maximumEarningsRounded * 1.1;
        
        multiBarChart.update();
    }
}



// Initialize and export the initialization function
function initializeApp() {
    // Initialize session values from input fields
    session.ability1 = parseInt(child1Ability.value);
    session.ability2 = parseInt(child2Ability.value);
    
    updateScenarioOptions();
    const scenario = SCENARIOS[0];
    compute_outcomes(session, scenario);
    create_single_bar_chart();
    create_line_chart();
    create_multi_bar_chart();
    // Update Chart.js chart
    updateChartData();
    updateDebugDisplay();
    
    // Set initial chart visibility
    updateChartVisibility();
    
    // Add event listeners
    investmentSlider.addEventListener('input', onSliderChange);
    scenarioSelect.addEventListener('change', onScenarioChange);
    graphTypeSelect.addEventListener('change', onGraphTypeChange);
    child1Ability.addEventListener('input', onAbilityChange);
    child2Ability.addEventListener('input', onAbilityChange);
}

// Export the initialization function for use as a module
export { initializeApp };