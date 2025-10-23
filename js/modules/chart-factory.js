import { SCENARIOS_METADATA } from './scenario-loader.js';
import { appState } from './app-state.js';

// Get colors based on which child is high/low
// If high_child === 1: child1 gets high colors (orange), child2 gets low colors (green)
// If high_child === 2: child1 gets low colors (green), child2 gets high colors (orange)
function getChildColors() {
    const isChild1High = appState.session.high_child === 1;

    return {
        CHILD1_COLOR: isChild1High ? SCENARIOS_METADATA.child_high_color : SCENARIOS_METADATA.child_low_color,
        CHILD1_BG_COLOR: isChild1High ? SCENARIOS_METADATA.child_high_bg_color : SCENARIOS_METADATA.child_low_bg_color,
        CHILD1_DARK_COLOR: isChild1High ? SCENARIOS_METADATA.child_high_dark_color : SCENARIOS_METADATA.child_low_dark_color,
        CHILD2_COLOR: isChild1High ? SCENARIOS_METADATA.child_low_color : SCENARIOS_METADATA.child_high_color,
        CHILD2_BG_COLOR: isChild1High ? SCENARIOS_METADATA.child_low_bg_color : SCENARIOS_METADATA.child_high_bg_color,
        CHILD2_DARK_COLOR: isChild1High ? SCENARIOS_METADATA.child_low_dark_color : SCENARIOS_METADATA.child_high_dark_color,
        COMBINED_COLOR: SCENARIOS_METADATA.combined_color,
        COMBINED_BG_COLOR: SCENARIOS_METADATA.combined_bg_color,
        LABEL_BG_COLOR: SCENARIOS_METADATA.label_bg_color,
        LABEL_BORDER_COLOR: SCENARIOS_METADATA.label_border_color
    };
}

// Chart Configuration Functions - Structured Composition Approach

function getAnimationConfig() {
    return { duration: 400 };
}

function getTooltipConfig() {
    return { enabled: false };
}

function getLayoutConfig(chartType) {
    if (chartType === 'singleBar') {
        return {
            padding: {
                top: 0,
                bottom: 10,
            }
        };
    }
    
    if (chartType === 'line') {
        return {
            padding: {
                top: 10,
                bottom: 10,
                left: 50,
                right: 50,
            }
        };
    }
    
    if (chartType === 'multiBar') {
        return {
            padding: {
                top: 10,
                bottom: 10,
                left: 20,
                right: 20
            }
        };
    }
    
    return {};
}

function getScalesConfig(chartType, scenarioData, child1Name = 'Child 1') {
    const maxEarnings = scenarioData.maximumEarningsRounded || 100; // fallback value
    const baseY = {
        beginAtZero: true,
        max: maxEarnings * 1.1
    };

    if (chartType === 'singleBar') {
        return {
            x: {
                grid: { display: false },
                ticks: { display: true },
                border: { display: false }
            },
            y: {
                ...baseY,
                display: false,
                grid: { display: false }
            }
        };
    }

    if (chartType === 'line') {
        return {
            x: {
                title: { display: true, text: `Número de sesiones` },
                ticks: { display: false },
                grid: { display: true, color: '#f0f0f0' }
            },
            y: {
                ...baseY,
                title: { display: false, text: 'Fichas' },
                ticks: { display: false },  // Hide Y-axis numbers
                grid: { display: true, color: '#f0f0f0' }
            }
        };
    }

    if (chartType === 'multiBar') {
        return {
            x: {
                title: { display: true, text: `Sesiones` },
                ticks: { display: false },
                grid: { display: false },
                stacked: true
            },
            y: {
                ...baseY,
                title: { display: false, text: 'Fichas' },
                ticks: { display: false },  // Hide Y-axis numbers
                grid: { display: false },
                stacked: true
            }
        };
    }

    return {};
}

function getLegendConfig(chartType, child1Name = 'Child 1', child2Name = 'Child 2') {
    const colors = getChildColors();

    if (chartType === 'singleBar') {
        return { display: false };
    }

    if (chartType === 'line') {
        return {
            display: true,
            position: 'top',
            labels: {
                generateLabels: function(chart) {
                    return [{
                        text: child1Name,
                        fillStyle: colors.CHILD1_COLOR,
                        strokeStyle: colors.CHILD1_COLOR,
                        lineWidth: 0,
                        datasetIndex: 0
                    }, {
                        text: child2Name,
                        fillStyle: colors.CHILD2_COLOR,
                        strokeStyle: colors.CHILD2_COLOR,
                        lineWidth: 0,
                        datasetIndex: 1
                    }, {
                        text: 'Total',
                        fillStyle: colors.COMBINED_COLOR,
                        strokeStyle: colors.COMBINED_COLOR,
                        lineWidth: 0,
                        datasetIndex: 2
                    }];
                }
            }
        };
    }

    if (chartType === 'multiBar') {
        return {
            display: true,
            position: 'top',
            labels: {
                generateLabels: function(chart) {
                    return [{
                        text: child1Name,
                        fillStyle: colors.CHILD1_BG_COLOR,
                        strokeStyle: colors.CHILD1_COLOR,
                        lineWidth: 0,
                        datasetIndex: 0
                    }, {
                        text: child2Name,
                        fillStyle: colors.CHILD2_BG_COLOR,
                        strokeStyle: colors.CHILD2_COLOR,
                        lineWidth: 0,
                        datasetIndex: 1
                    }];
                }
            }
        };
    }

    return { display: false };
}

function getDataLabelsConfig(chartType, selectedIndex = 0, scenarioData) {
    const colors = getChildColors();
    const baseConfig = {
        formatter: (value) => value.toLocaleString(),
        font: { weight: 'bold' },
        backgroundColor: colors.LABEL_BG_COLOR,
        borderWidth: 1,
        borderRadius: 4,
        padding: 4
    };
    
    if (chartType === 'singleBar') {
        return {
            ...baseConfig,
            display: true,
            anchor: 'end',
            align: 'end',
            offset: 0,
            font: { weight: 'bold', size: 12 },
            color: '#333'
        };
    }
    
    if (chartType === 'line') {
        return {
            ...baseConfig,
            display: function(context) {
                return appState.sliderTouched && context.dataIndex === selectedIndex;
            },
            anchor: function(context) {
                const datasetIndex = context.datasetIndex;
                const child1Value = scenarioData.postEarnings1Rounded[selectedIndex];
                const child2Value = scenarioData.postEarnings2Rounded[selectedIndex];
                const combinedValue = scenarioData.aggrEarningsRounded[selectedIndex];
                
                const values = [
                    { dataset: 0, value: child1Value },
                    { dataset: 1, value: child2Value },
                    { dataset: 2, value: combinedValue }
                ].sort((a, b) => b.value - a.value);
                
                const rank = values.findIndex(item => item.dataset === datasetIndex);
                
                if (rank === 0) return 'end';
                if (rank === 1) return 'center';
                return 'start';
            },
            align: function(context) {
                const datasetIndex = context.datasetIndex;
                const child1Value = scenarioData.postEarnings1Rounded[selectedIndex];
                const child2Value = scenarioData.postEarnings2Rounded[selectedIndex];
                const combinedValue = scenarioData.aggrEarningsRounded[selectedIndex];
                
                const values = [
                    { dataset: 0, value: child1Value },
                    { dataset: 1, value: child2Value },
                    { dataset: 2, value: combinedValue }
                ].sort((a, b) => b.value - a.value);
                
                const rank = values.findIndex(item => item.dataset === datasetIndex);
                
                if (rank === 0) return 'top';
                if (rank === 1) return 'right';
                return 'bottom';
            },
            offset: 10,
            font: { weight: 'bold', size: 11 },
            color: '#333',
            borderColor: colors.LABEL_BORDER_COLOR
        };
    }

    if (chartType === 'multiBar') {
        return {
            ...baseConfig,
            display: function(context) {
                return appState.sliderTouched && context.dataIndex === selectedIndex;
            },
            anchor: function(context) {
                return context.datasetIndex === 0 ? 'start' : 'end';
            },
            align: function(context) {
                return context.datasetIndex === 0 ? 'bottom' : 'top';
            },
            offset: 8,
            font: { weight: 'bold', size: 11 },
            color: function(context) {
                return context.datasetIndex === 0 ? colors.CHILD1_DARK_COLOR : colors.CHILD2_DARK_COLOR;
            },
            borderColor: function(context) {
                return context.datasetIndex === 0 ? colors.CHILD1_DARK_COLOR : colors.CHILD2_DARK_COLOR;
            }
        };
    }
    
    return baseConfig;
}

function getLabels(chartType, child1Name = 'Child 1', child2Name = 'Child 2') {
    const ALLOCATABLE_BUDGET = SCENARIOS_METADATA.allocatable_budget;
    if (chartType === 'singleBar') {
        return [child1Name, child2Name, 'Combined'];
    }

    if (chartType === 'line' || chartType === 'multiBar') {
        return Array.from({length: ALLOCATABLE_BUDGET + 1}, (_, i) => i);
    }

    return [];
}

function createChild1DisplayConfig(chartType, scenarioData, child1Name = 'Child 1') {
    const colors = getChildColors();
    const ALLOCATABLE_BUDGET = SCENARIOS_METADATA.allocatable_budget;
    if (chartType === 'singleBar') {
        // For single bar chart, Child1 data is just the current value
        return {
            label: 'Distribución de fichas',
            data: [0, 0, 0], // Will be updated with current values
            backgroundColor: [colors.CHILD1_COLOR, colors.CHILD2_COLOR, colors.COMBINED_COLOR],
            borderColor: [colors.CHILD1_COLOR, colors.CHILD2_COLOR, colors.COMBINED_COLOR],
            borderWidth: 0,
            barPercentage: 0.5,
            categoryPercentage: 1
        };
    }

    if (chartType === 'line') {
        return {
            label: child1Name,
            data: scenarioData.postEarnings1Rounded,
            borderColor: colors.CHILD1_COLOR,
            backgroundColor: colors.CHILD1_BG_COLOR,
            borderWidth: 3,
            tension: 0.1,
            pointRadius: Array(ALLOCATABLE_BUDGET + 1).fill(4),
            pointHoverRadius: Array(ALLOCATABLE_BUDGET + 1).fill(6),
            pointBackgroundColor: Array(ALLOCATABLE_BUDGET + 1).fill(colors.CHILD1_COLOR),
            pointBorderColor: Array(ALLOCATABLE_BUDGET + 1).fill('#ffffff'),
            pointBorderWidth: Array(ALLOCATABLE_BUDGET + 1).fill(2)
        };
    }

    if (chartType === 'multiBar') {
        return {
            label: child1Name,
            data: scenarioData.postEarnings1Rounded,
            backgroundColor: Array(ALLOCATABLE_BUDGET + 1).fill(colors.CHILD1_BG_COLOR),
            borderColor: Array(ALLOCATABLE_BUDGET + 1).fill(colors.CHILD1_COLOR),
            borderWidth: Array(ALLOCATABLE_BUDGET + 1).fill(0),
            barPercentage: 0.8,
            categoryPercentage: 0.9
        };
    }

    return {};
}

function createChild2DisplayConfig(chartType, scenarioData, child2Name = 'Child 2') {
    const colors = getChildColors();
    const ALLOCATABLE_BUDGET = SCENARIOS_METADATA.allocatable_budget;
    if (chartType === 'singleBar') {
        // Single bar chart handles all data in one dataset
        return null;
    }

    if (chartType === 'line') {
        return {
            label: child2Name,
            data: scenarioData.postEarnings2Rounded,
            borderColor: colors.CHILD2_COLOR,
            backgroundColor: colors.CHILD2_BG_COLOR,
            borderWidth: 3,
            tension: 0.1,
            pointRadius: Array(ALLOCATABLE_BUDGET + 1).fill(4),
            pointHoverRadius: Array(ALLOCATABLE_BUDGET + 1).fill(6),
            pointBackgroundColor: Array(ALLOCATABLE_BUDGET + 1).fill(colors.CHILD2_COLOR),
            pointBorderColor: Array(ALLOCATABLE_BUDGET + 1).fill('#ffffff'),
            pointBorderWidth: Array(ALLOCATABLE_BUDGET + 1).fill(2)
        };
    }

    if (chartType === 'multiBar') {
        return {
            label: child2Name,
            data: scenarioData.postEarnings2Rounded,
            backgroundColor: Array(ALLOCATABLE_BUDGET + 1).fill(colors.CHILD2_BG_COLOR),
            borderColor: Array(ALLOCATABLE_BUDGET + 1).fill(colors.CHILD2_COLOR),
            borderWidth: Array(ALLOCATABLE_BUDGET + 1).fill(0),
            barPercentage: 0.8,
            categoryPercentage: 0.9
        };
    }

    return {};
}

function createCombinedDisplayConfig(chartType, scenarioData) {
    const colors = getChildColors();
    const ALLOCATABLE_BUDGET = SCENARIOS_METADATA.allocatable_budget;
    if (chartType === 'singleBar') {
        // Single bar chart handles all data in one dataset
        return null;
    }

    if (chartType === 'line') {
        return {
            label: 'Total',
            data: scenarioData.aggrEarningsRounded,
            borderColor: colors.COMBINED_COLOR,
            backgroundColor: colors.COMBINED_BG_COLOR,
            borderWidth: 3,
            tension: 0.1,
            pointRadius: Array(ALLOCATABLE_BUDGET + 1).fill(4),
            pointHoverRadius: Array(ALLOCATABLE_BUDGET + 1).fill(6),
            pointBackgroundColor: Array(ALLOCATABLE_BUDGET + 1).fill(colors.COMBINED_COLOR),
            pointBorderColor: Array(ALLOCATABLE_BUDGET + 1).fill('#ffffff'),
            pointBorderWidth: Array(ALLOCATABLE_BUDGET + 1).fill(2)
        };
    }

    if (chartType === 'multiBar') {
        // Multi bar chart only shows Child 1 and Child 2
        return null;
    }

    return {};
}

function createAllDatasets(chartType, scenarioData, child1Name = 'Child 1', child2Name = 'Child 2') {
    const datasets = [];

    const child1Config = createChild1DisplayConfig(chartType, scenarioData, child1Name);
    if (child1Config) datasets.push(child1Config);

    const child2Config = createChild2DisplayConfig(chartType, scenarioData, child2Name);
    if (child2Config) datasets.push(child2Config);

    const combinedConfig = createCombinedDisplayConfig(chartType, scenarioData);
    if (combinedConfig) datasets.push(combinedConfig);

    return datasets;
}

export function createChart(type, context, scenarioData, options = {}) {
    // Check if Chart.js is available
    if (typeof Chart === 'undefined') {
        console.error('Chart.js is not loaded!');
        return null;
    }

    const selectedIndex = options.selectedIndex || 0;
    const child1Name = options.child1Name || 'Child 1';
    const child2Name = options.child2Name || 'Child 2';

    // Handle chart type specific configurations
    let chartConfig = {
        type: (type === 'singleBar' || type === 'multiBar') ? 'bar' : type,
        data: {
            labels: getLabels(type, child1Name, child2Name),
            datasets: createAllDatasets(type, scenarioData, child1Name, child2Name)
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            animation: getAnimationConfig(),
            plugins: {
                tooltip: getTooltipConfig(),
                legend: getLegendConfig(type, child1Name, child2Name),
                datalabels: getDataLabelsConfig(type, selectedIndex, scenarioData)
            },
            scales: getScalesConfig(type, scenarioData, child1Name),
            layout: getLayoutConfig(type)
        }
    };
    
    // Handle any specific overrides
    if (options.data) {
        chartConfig.data = { ...chartConfig.data, ...options.data };
    }
    
    try {
        return new Chart(context, chartConfig);
    } catch (error) {
        console.error('Error creating chart:', error);
        return null;
    }
}

// Individual configuration functions used internally only

// Chart management class for handling chart instances and updates
export class ChartManager {
    constructor(child1Name = 'Child 1', child2Name = 'Child 2') {
        this.charts = {
            barChart: null,
            lineChart: null,
            multiBarChart: null
        };
        this.child1Name = child1Name;
        this.child2Name = child2Name;
    }

    // Properly destroy a single chart instance
    destroyChart(chartName) {
        if (this.charts[chartName]) {
            try {
                // Chart.js provides destroy() method to clean up resources
                this.charts[chartName].destroy();
            } catch (error) {
                console.warn(`Error destroying chart ${chartName}:`, error);
            }
            this.charts[chartName] = null;
            // Also clear reference in appState
            appState.clearChart(chartName);
        }
    }

    // Destroy all chart instances
    destroyAllCharts() {
        Object.keys(this.charts).forEach(chartName => {
            this.destroyChart(chartName);
        });
    }

    // Check if chart exists and is valid
    isChartValid(chartName) {
        return this.charts[chartName] && !this.charts[chartName].destroyed;
    }

    createAllCharts(uiManager, appState) {
        const sd = appState.scenarioData;
        
        // Destroy existing charts before creating new ones to prevent memory leaks
        this.destroyAllCharts();
        
        // Create single bar chart
        if (uiManager.ctx) {
            this.charts.barChart = createChart('singleBar', uiManager.ctx, sd, {
                selectedIndex: appState.selectedInvestment,
                child1Name: this.child1Name,
                child2Name: this.child2Name
            });
            appState.setChart('barChart', this.charts.barChart);
        }

        // Create line chart
        if (uiManager.lineCtx) {
            this.charts.lineChart = createChart('line', uiManager.lineCtx, sd, {
                selectedIndex: appState.selectedInvestment,
                child1Name: this.child1Name,
                child2Name: this.child2Name
            });
            appState.setChart('lineChart', this.charts.lineChart);
        }

        // Create multi-bar chart
        if (uiManager.multiBarCtx) {
            this.charts.multiBarChart = createChart('multiBar', uiManager.multiBarCtx, sd, {
                selectedIndex: appState.selectedInvestment,
                child1Name: this.child1Name,
                child2Name: this.child2Name
            });
            appState.setChart('multiBarChart', this.charts.multiBarChart);
        }
    }

    updateChartData(appState, CONFIG) {
        const colors = getChildColors();
        const sd = appState.scenarioData;
        const selectedIndex = appState.selectedInvestment;
        const ALLOCATABLE_BUDGET = SCENARIOS_METADATA.allocatable_budget;

        // Validate input data
        if (!sd || selectedIndex < 0 || !sd.postEarnings1Rounded || !sd.postEarnings2Rounded || !sd.aggrEarningsRounded) {
            console.warn('Invalid scenario data provided to updateChartData');
            return;
        }

        // Update single bar chart
        if (this.isChartValid('barChart')) {
            try {
                this.charts.barChart.data.datasets[0].data = [
                    sd.postEarnings1Rounded[selectedIndex],
                    sd.postEarnings2Rounded[selectedIndex],
                    sd.aggrEarningsRounded[selectedIndex]
                ];
                this.charts.barChart.update();
            } catch (error) {
                console.error('Error updating bar chart:', error);
                this.destroyChart('barChart');
            }
        }

        // Update line chart
        if (this.isChartValid('lineChart')) {
            try {
                this.charts.lineChart.data.datasets[0].data = sd.postEarnings1Rounded;
                this.charts.lineChart.data.datasets[1].data = sd.postEarnings2Rounded;
                this.charts.lineChart.data.datasets[2].data = sd.aggrEarningsRounded;

                // Update datalabels configuration for selected point
                this.charts.lineChart.options.plugins.datalabels = getDataLabelsConfig('line', selectedIndex, sd);

                // Update y-axis max
                this.charts.lineChart.options.scales.y.max = sd.maximumEarningsRounded * 1.1;

                // Update point highlighting (larger dot for selected point)
                const highlightedRadius = Array(ALLOCATABLE_BUDGET + 1).fill(4);
                const highlightedBorderWidth = Array(ALLOCATABLE_BUDGET + 1).fill(2);

                // Only highlight if slider has been touched
                if (appState.sliderTouched) {
                    highlightedRadius[selectedIndex] = 8;
                    highlightedBorderWidth[selectedIndex] = 4;
                }

                this.charts.lineChart.data.datasets.forEach((dataset) => {
                    dataset.pointRadius = [...highlightedRadius];
                    dataset.pointBorderWidth = [...highlightedBorderWidth];
                    const borderColors = Array(ALLOCATABLE_BUDGET + 1).fill('#ffffff');
                    if (appState.sliderTouched) {
                        borderColors[selectedIndex] = '#000000';
                    }
                    dataset.pointBorderColor = borderColors;
                });

                this.charts.lineChart.update();
            } catch (error) {
                console.error('Error updating line chart:', error);
                this.destroyChart('lineChart');
            }
        }

        // Update multi-bar chart
        if (this.isChartValid('multiBarChart')) {
            try {
                this.charts.multiBarChart.data.datasets[0].data = sd.postEarnings1Rounded;
                this.charts.multiBarChart.data.datasets[1].data = sd.postEarnings2Rounded;

                // Update datalabels configuration
                this.charts.multiBarChart.options.plugins.datalabels = getDataLabelsConfig('multiBar', selectedIndex, sd);

                // Update highlighting for selected bar
                const backgroundColors1 = Array(ALLOCATABLE_BUDGET + 1).fill(colors.CHILD1_BG_COLOR);
                const backgroundColors2 = Array(ALLOCATABLE_BUDGET + 1).fill(colors.CHILD2_BG_COLOR);
                const borderColors1 = Array(ALLOCATABLE_BUDGET + 1).fill(colors.CHILD1_COLOR);
                const borderColors2 = Array(ALLOCATABLE_BUDGET + 1).fill(colors.CHILD2_COLOR);
                const borderWidths = Array(ALLOCATABLE_BUDGET + 1).fill(0);

                // Highlight selected bar (darker for selected)
                backgroundColors1[selectedIndex] = colors.CHILD1_COLOR;
                backgroundColors2[selectedIndex] = colors.CHILD2_COLOR;
                borderColors1[selectedIndex] = colors.CHILD1_DARK_COLOR;
                borderColors2[selectedIndex] = colors.CHILD2_DARK_COLOR;

                this.charts.multiBarChart.data.datasets[0].backgroundColor = backgroundColors1;
                this.charts.multiBarChart.data.datasets[0].borderColor = borderColors1;
                this.charts.multiBarChart.data.datasets[0].borderWidth = borderWidths;
                this.charts.multiBarChart.data.datasets[1].backgroundColor = backgroundColors2;
                this.charts.multiBarChart.data.datasets[1].borderColor = borderColors2;
                this.charts.multiBarChart.data.datasets[1].borderWidth = borderWidths;

                // Update y-axis max
                this.charts.multiBarChart.options.scales.y.max = sd.maximumEarningsRounded * 1.1;

                this.charts.multiBarChart.update();
            } catch (error) {
                console.error('Error updating multi-bar chart:', error);
                this.destroyChart('multiBarChart');
            }
        }
    }

    // Setup integration with UI manager
    setupUIChartIntegration(uiManager, appState, CONFIG) {
        // Override uiManager's updateCharts method
        uiManager.updateCharts = () => {
            this.updateChartData(appState, CONFIG);
        };

        // Override uiManager's updateChartSelection method
        uiManager.updateChartSelection = () => {
            this.updateChartData(appState, CONFIG);
        };
    }

    // Cleanup method for when application is being destroyed or reset
    cleanup() {
        console.log('Cleaning up chart manager resources...');
        this.destroyAllCharts();
    }
}

// Add missing export for createChart function access to sub-functions
createChart.getDataLabelsConfig = getDataLabelsConfig;