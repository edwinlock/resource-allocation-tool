import { CONFIG, COLORS } from './constants.js';

const { ALLOCATABLE_BUDGET } = CONFIG;
const {
    CHILD1_COLOR, CHILD1_BG_COLOR, CHILD1_DARK_COLOR,
    CHILD2_COLOR, CHILD2_BG_COLOR, CHILD2_DARK_COLOR,
    COMBINED_COLOR, COMBINED_BG_COLOR,
    LABEL_BG_COLOR, LABEL_BORDER_COLOR
} = COLORS;

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

function getScalesConfig(chartType, scenarioData) {
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
                title: { display: true, text: 'Investment into Child 1' },
                grid: { display: true, color: '#f0f0f0' }
            },
            y: {
                ...baseY,
                title: { display: true, text: 'Earnings' },
                grid: { display: true, color: '#f0f0f0' }
            }
        };
    }
    
    if (chartType === 'multiBar') {
        return {
            x: {
                title: { display: true, text: 'Investment into Child 1' },
                grid: { display: false },
                stacked: true
            },
            y: {
                ...baseY,
                title: { display: true, text: 'Earnings' },
                grid: { display: false },
                stacked: true
            }
        };
    }
    
    return {};
}

function getLegendConfig(chartType) {
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
                        text: 'Child 1',
                        fillStyle: CHILD1_COLOR,
                        strokeStyle: CHILD1_COLOR,
                        lineWidth: 0,
                        datasetIndex: 0
                    }, {
                        text: 'Child 2',
                        fillStyle: CHILD2_COLOR,
                        strokeStyle: CHILD2_COLOR,
                        lineWidth: 0,
                        datasetIndex: 1
                    }, {
                        text: 'Combined',
                        fillStyle: COMBINED_COLOR,
                        strokeStyle: COMBINED_COLOR,
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
                        text: 'Child 1',
                        fillStyle: CHILD1_BG_COLOR,
                        strokeStyle: CHILD1_COLOR,
                        lineWidth: 0,
                        datasetIndex: 0
                    }, {
                        text: 'Child 2', 
                        fillStyle: CHILD2_BG_COLOR,
                        strokeStyle: CHILD2_COLOR,
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
    const baseConfig = {
        formatter: (value) => value.toLocaleString(),
        font: { weight: 'bold' },
        backgroundColor: LABEL_BG_COLOR,
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
                return context.dataIndex === selectedIndex;
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
            borderColor: LABEL_BORDER_COLOR
        };
    }
    
    if (chartType === 'multiBar') {
        return {
            ...baseConfig,
            display: function(context) {
                return context.dataIndex === selectedIndex;
            },
            anchor: function(context) {
                return context.datasetIndex === 0 ? 'end' : 'start';
            },
            align: function(context) {
                return context.datasetIndex === 0 ? 'top' : 'bottom';
            },
            offset: 8,
            font: { weight: 'bold', size: 11 },
            color: function(context) {
                return context.datasetIndex === 0 ? CHILD1_DARK_COLOR : CHILD2_DARK_COLOR;
            },
            borderColor: function(context) {
                return context.datasetIndex === 0 ? CHILD1_DARK_COLOR : CHILD2_DARK_COLOR;
            }
        };
    }
    
    return baseConfig;
}

function getLabels(chartType) {
    if (chartType === 'singleBar') {
        return ['Child 1', 'Child 2', 'Combined'];
    }
    
    if (chartType === 'line' || chartType === 'multiBar') {
        return Array.from({length: ALLOCATABLE_BUDGET + 1}, (_, i) => i);
    }
    
    return [];
}

function createChild1DisplayConfig(chartType, scenarioData) {
    if (chartType === 'singleBar') {
        // For single bar chart, Child1 data is just the current value
        return {
            label: 'Earnings',
            data: [0, 0, 0], // Will be updated with current values
            backgroundColor: [CHILD1_COLOR, CHILD2_COLOR, COMBINED_COLOR],
            borderColor: [CHILD1_COLOR, CHILD2_COLOR, COMBINED_COLOR],
            borderWidth: 0,
            barPercentage: 0.5,
            categoryPercentage: 1
        };
    }
    
    if (chartType === 'line') {
        return {
            label: 'Child 1',
            data: scenarioData.postEarnings1Rounded,
            borderColor: CHILD1_COLOR,
            backgroundColor: CHILD1_BG_COLOR,
            borderWidth: 3,
            tension: 0.1,
            pointRadius: Array(ALLOCATABLE_BUDGET + 1).fill(4),
            pointHoverRadius: Array(ALLOCATABLE_BUDGET + 1).fill(6),
            pointBackgroundColor: Array(ALLOCATABLE_BUDGET + 1).fill(CHILD1_COLOR),
            pointBorderColor: Array(ALLOCATABLE_BUDGET + 1).fill('#ffffff'),
            pointBorderWidth: Array(ALLOCATABLE_BUDGET + 1).fill(2)
        };
    }
    
    if (chartType === 'multiBar') {
        return {
            label: 'Child 1',
            data: scenarioData.postEarnings1Rounded,
            backgroundColor: Array(ALLOCATABLE_BUDGET + 1).fill(CHILD1_BG_COLOR),
            borderColor: Array(ALLOCATABLE_BUDGET + 1).fill(CHILD1_COLOR),
            borderWidth: Array(ALLOCATABLE_BUDGET + 1).fill(0),
            barPercentage: 0.8,
            categoryPercentage: 0.9
        };
    }
    
    return {};
}

function createChild2DisplayConfig(chartType, scenarioData) {
    if (chartType === 'singleBar') {
        // Single bar chart handles all data in one dataset
        return null;
    }
    
    if (chartType === 'line') {
        return {
            label: 'Child 2', 
            data: scenarioData.postEarnings2Rounded,
            borderColor: CHILD2_COLOR,
            backgroundColor: CHILD2_BG_COLOR,
            borderWidth: 3,
            tension: 0.1,
            pointRadius: Array(ALLOCATABLE_BUDGET + 1).fill(4),
            pointHoverRadius: Array(ALLOCATABLE_BUDGET + 1).fill(6),
            pointBackgroundColor: Array(ALLOCATABLE_BUDGET + 1).fill(CHILD2_COLOR),
            pointBorderColor: Array(ALLOCATABLE_BUDGET + 1).fill('#ffffff'),
            pointBorderWidth: Array(ALLOCATABLE_BUDGET + 1).fill(2)
        };
    }
    
    if (chartType === 'multiBar') {
        return {
            label: 'Child 2',
            data: scenarioData.postEarnings2Rounded,
            backgroundColor: Array(ALLOCATABLE_BUDGET + 1).fill(CHILD2_BG_COLOR),
            borderColor: Array(ALLOCATABLE_BUDGET + 1).fill(CHILD2_COLOR),
            borderWidth: Array(ALLOCATABLE_BUDGET + 1).fill(0),
            barPercentage: 0.8,
            categoryPercentage: 0.9
        };
    }
    
    return {};
}

function createCombinedDisplayConfig(chartType, scenarioData) {
    if (chartType === 'singleBar') {
        // Single bar chart handles all data in one dataset
        return null;
    }
    
    if (chartType === 'line') {
        return {
            label: 'Combined',
            data: scenarioData.aggrEarningsRounded,
            borderColor: COMBINED_COLOR,
            backgroundColor: COMBINED_BG_COLOR,
            borderWidth: 3,
            tension: 0.1,
            pointRadius: Array(ALLOCATABLE_BUDGET + 1).fill(4),
            pointHoverRadius: Array(ALLOCATABLE_BUDGET + 1).fill(6),
            pointBackgroundColor: Array(ALLOCATABLE_BUDGET + 1).fill(COMBINED_COLOR),
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

function createAllDatasets(chartType, scenarioData) {
    const datasets = [];
    
    const child1Config = createChild1DisplayConfig(chartType, scenarioData);
    if (child1Config) datasets.push(child1Config);
    
    const child2Config = createChild2DisplayConfig(chartType, scenarioData);
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
    
    // Handle chart type specific configurations
    let chartConfig = {
        type: (type === 'singleBar' || type === 'multiBar') ? 'bar' : type,
        data: {
            labels: getLabels(type),
            datasets: createAllDatasets(type, scenarioData)
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            animation: getAnimationConfig(),
            plugins: {
                tooltip: getTooltipConfig(),
                legend: getLegendConfig(type),
                datalabels: getDataLabelsConfig(type, selectedIndex, scenarioData)
            },
            scales: getScalesConfig(type, scenarioData),
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

// Export individual configuration functions for chart updates
export {
    getDataLabelsConfig,
    getScalesConfig,
    createChild1DisplayConfig,
    createChild2DisplayConfig,
    createCombinedDisplayConfig
};

// Chart management class for handling chart instances and updates
export class ChartManager {
    constructor() {
        this.charts = {
            barChart: null,
            lineChart: null,
            multiBarChart: null
        };
    }

    createAllCharts(uiManager, appState) {
        const sd = appState.scenarioData;
        
        // Create single bar chart
        if (uiManager.ctx) {
            this.charts.barChart = createChart('singleBar', uiManager.ctx, sd, {
                selectedIndex: appState.selectedInvestment
            });
            appState.setChart('barChart', this.charts.barChart);
        }

        // Create line chart
        if (uiManager.lineCtx) {
            this.charts.lineChart = createChart('line', uiManager.lineCtx, sd, {
                selectedIndex: appState.selectedInvestment
            });
            appState.setChart('lineChart', this.charts.lineChart);
        }

        // Create multi-bar chart
        if (uiManager.multiBarCtx) {
            this.charts.multiBarChart = createChart('multiBar', uiManager.multiBarCtx, sd, {
                selectedIndex: appState.selectedInvestment
            });
            appState.setChart('multiBarChart', this.charts.multiBarChart);
        }
    }

    updateChartData(appState, CONFIG) {
        const sd = appState.scenarioData;
        const selectedIndex = appState.selectedInvestment;
        const { ALLOCATABLE_BUDGET } = CONFIG;

        // Update single bar chart
        if (this.charts.barChart) {
            this.charts.barChart.data.datasets[0].data = [
                sd.postEarnings1Rounded[selectedIndex],
                sd.postEarnings2Rounded[selectedIndex], 
                sd.aggrEarningsRounded[selectedIndex]
            ];
            this.charts.barChart.update();
        }

        // Update line chart
        if (this.charts.lineChart) {
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
            highlightedRadius[selectedIndex] = 8;
            highlightedBorderWidth[selectedIndex] = 4;
            
            this.charts.lineChart.data.datasets.forEach((dataset) => {
                dataset.pointRadius = [...highlightedRadius];
                dataset.pointBorderWidth = [...highlightedBorderWidth];
                const borderColors = Array(ALLOCATABLE_BUDGET + 1).fill('#ffffff');
                borderColors[selectedIndex] = '#000000';
                dataset.pointBorderColor = borderColors;
            });
            
            this.charts.lineChart.update();
        }

        // Update multi-bar chart
        if (this.charts.multiBarChart) {
            this.charts.multiBarChart.data.datasets[0].data = sd.postEarnings1Rounded;
            this.charts.multiBarChart.data.datasets[1].data = sd.postEarnings2Rounded;
            
            // Update datalabels configuration
            this.charts.multiBarChart.options.plugins.datalabels = getDataLabelsConfig('multiBar', selectedIndex, sd);
            
            // Update highlighting for selected bar
            const backgroundColors1 = Array(ALLOCATABLE_BUDGET + 1).fill('#aecbea');
            const backgroundColors2 = Array(ALLOCATABLE_BUDGET + 1).fill('#ffc788');
            const borderColors1 = Array(ALLOCATABLE_BUDGET + 1).fill('#1f77b4');
            const borderColors2 = Array(ALLOCATABLE_BUDGET + 1).fill('#ff7f0e');
            const borderWidths = Array(ALLOCATABLE_BUDGET + 1).fill(0);
            
            // Highlight selected bar
            backgroundColors1[selectedIndex] = '#1f77b4';
            backgroundColors2[selectedIndex] = '#ff7f0e';
            borderColors1[selectedIndex] = '#0f4c75';
            borderColors2[selectedIndex] = '#cc5500';
            
            this.charts.multiBarChart.data.datasets[0].backgroundColor = backgroundColors1;
            this.charts.multiBarChart.data.datasets[0].borderColor = borderColors1;
            this.charts.multiBarChart.data.datasets[0].borderWidth = borderWidths;
            this.charts.multiBarChart.data.datasets[1].backgroundColor = backgroundColors2;
            this.charts.multiBarChart.data.datasets[1].borderColor = borderColors2;
            this.charts.multiBarChart.data.datasets[1].borderWidth = borderWidths;
            
            // Update y-axis max
            this.charts.multiBarChart.options.scales.y.max = sd.maximumEarningsRounded * 1.1;
            
            this.charts.multiBarChart.update();
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
}

// Add missing export for createChart function access to sub-functions
createChart.getDataLabelsConfig = getDataLabelsConfig;