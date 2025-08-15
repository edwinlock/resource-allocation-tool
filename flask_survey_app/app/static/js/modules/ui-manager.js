import { CONFIG, SCENARIOS } from './constants.js';
import { appState } from './app-state.js';

const { ALLOCATABLE_BUDGET } = CONFIG;

// DOM element management and event handlers
export class UIManager {
    constructor() {
        this.initializeDOMElements();
    }

    initializeDOMElements() {
        // Development elements
        this.child1Ability = document.getElementById('child1-ability');
        this.child2Ability = document.getElementById('child2-ability');
        
        // Permanent UI elements
        this.investmentSlider = document.getElementById('investment-slider');
        this.child1Display = document.getElementById('child1-display');
        this.child2Display = document.getElementById('child2-display');
        this.scenarioSelect = document.getElementById('scenario-select');
        this.scenarioDesc = document.getElementById('scenario-desc');
        this.child1Bar = document.getElementById('child1-bar');
        this.child2Bar = document.getElementById('child2-bar');
        this.child1BarValue = document.getElementById('child1-bar-value');
        this.child2BarValue = document.getElementById('child2-bar-value');
        
        // Chart canvases
        this.ctx = document.getElementById('single-bar-chart-canvas');
        this.lineCtx = document.getElementById('line-chart-canvas');
        this.multiBarCtx = document.getElementById('multi-bar-chart-canvas');
        this.graphTypeSelect = document.getElementById('graph-type-select');
        
        // Debug elements
        this.debugPre1 = document.getElementById('debug-pre1');
        this.debugPre2 = document.getElementById('debug-pre2');
        this.debugSelected = document.getElementById('debug-selected');
        this.debugMax = document.getElementById('debug-max');
        this.debugAlpha = document.getElementById('debug-alpha');
        // Note: debug table cells are accessed dynamically by ID in updateDebugDisplay()
        
        // Session navigation buttons
        this.nextButton = document.getElementById('nextButton');
        this.prevButton = document.getElementById('prevButton');
    }

    // Initialize scenario dropdown options
    updateScenarioOptions() {
        if (this.scenarioSelect) {
            this.scenarioSelect.innerHTML = '';
            SCENARIOS.forEach((scenario, index) => {
                const option = document.createElement('option');
                option.value = index;
                option.textContent = `${scenario.name}: ${scenario.description}`;
                this.scenarioSelect.appendChild(option);
            });
        }
    }

    // Update scenario dropdown selection to match current scenario
    updateScenarioDropdown() {
        if (this.scenarioSelect && appState.sliderState.currentScenarioNumber !== null) {
            this.scenarioSelect.value = appState.sliderState.currentScenarioNumber;
        }
    }

    // Event handlers
    setupEventListeners() {
        if (this.investmentSlider) {
            this.investmentSlider.addEventListener('input', this.onSliderChange.bind(this));
        }
        
        if (this.scenarioSelect) {
            this.scenarioSelect.addEventListener('change', this.onScenarioChange.bind(this));
        }
        
        if (this.graphTypeSelect) {
            this.graphTypeSelect.addEventListener('change', this.onGraphTypeChange.bind(this));
        }
        
        if (this.child1Ability) {
            this.child1Ability.addEventListener('input', this.onAbilityChange.bind(this));
        }
        
        if (this.child2Ability) {
            this.child2Ability.addEventListener('input', this.onAbilityChange.bind(this));
        }
    }

    onSliderChange(event) {
        const value = parseInt(event.target.value);
        appState.setSelectedInvestment(value);
        this.updateDisplays();
        this.updateChartSelection(value);
    }

    onScenarioChange(event) {
        const scenarioIndex = parseInt(event.target.value);
        const scenario = SCENARIOS[scenarioIndex];
        appState.computeScenarioOutcomes(scenario);
        this.updateCharts();
        this.updateDebugDisplay();
    }

    onGraphTypeChange() {
        this.updateChartVisibility();
    }

    onAbilityChange() {
        if (this.child1Ability && this.child2Ability) {
            appState.updateSession({
                abilityScore1: parseInt(this.child1Ability.value),
                abilityScore2: parseInt(this.child2Ability.value)
            });
            
            const currentScenario = SCENARIOS[this.scenarioSelect ? parseInt(this.scenarioSelect.value) : 0];
            appState.computeScenarioOutcomes(currentScenario);
            this.updateCharts();
            this.updateDebugDisplay();
        }
    }

    // UI update methods
    updateDisplays() {
        const selected = appState.selectedInvestment;
        
        if (this.child1Display) {
            this.child1Display.textContent = selected;
        }
        
        if (this.child2Display) {
            this.child2Display.textContent = ALLOCATABLE_BUDGET - selected;
        }
    }

    updateSessionDisplay() {
        const session = appState.session;
        if (this.child1Ability) this.child1Ability.value = session.abilityScore1;
        if (this.child2Ability) this.child2Ability.value = session.abilityScore2;
        this.updateDisplays();
    }

    updateDebugDisplay() {
        const sd = appState.scenarioData;
        const selected = appState.selectedInvestment;
        
        // Update simple debug values
        if (this.debugPre1) this.debugPre1.textContent = sd.preEarnings1;
        if (this.debugPre2) this.debugPre2.textContent = sd.preEarnings2;
        if (this.debugSelected) this.debugSelected.textContent = selected;
        if (this.debugMax) this.debugMax.textContent = sd.maximumEarningsRounded;
        if (this.debugAlpha) this.debugAlpha.textContent = sd.alpha?.toFixed(3);
        
        // Update table cells (matching original logic)
        for (let i = 0; i <= ALLOCATABLE_BUDGET; i++) {
            const post1Element = document.getElementById(`debug-post1-${i}`);
            const post2Element = document.getElementById(`debug-post2-${i}`);
            const totalElement = document.getElementById(`debug-total-${i}`);
            const post1rElement = document.getElementById(`debug-post1r-${i}`);
            const post2rElement = document.getElementById(`debug-post2r-${i}`);
            
            if (post1Element && sd.postEarnings1) post1Element.textContent = sd.postEarnings1[i]?.toFixed(1);
            if (post2Element && sd.postEarnings2) post2Element.textContent = sd.postEarnings2[i]?.toFixed(1);
            if (totalElement && sd.aggrEarningsRounded) totalElement.textContent = sd.aggrEarningsRounded[i];
            if (post1rElement && sd.postEarnings1Rounded) post1rElement.textContent = sd.postEarnings1Rounded[i];
            if (post2rElement && sd.postEarnings2Rounded) post2rElement.textContent = sd.postEarnings2Rounded[i];
        }

        // Update bar visualization
        this.updateBarVisualization();
    }

    updateBarVisualization() {
        const sd = appState.scenarioData;
        const selected = appState.selectedInvestment;

        if (this.child1Bar && this.child2Bar && sd.postEarnings1Rounded && sd.postEarnings2Rounded) {
            const child1Earnings = sd.postEarnings1Rounded[selected];
            const child2Earnings = sd.postEarnings2Rounded[selected];
            const maxEarnings = sd.maximumEarningsRounded;

            const child1Height = maxEarnings > 0 ? (child1Earnings / maxEarnings) * 100 : 0;
            const child2Height = maxEarnings > 0 ? (child2Earnings / maxEarnings) * 100 : 0;

            this.child1Bar.style.height = `${child1Height}%`;
            this.child2Bar.style.height = `${child2Height}%`;

            if (this.child1BarValue) this.child1BarValue.textContent = child1Earnings;
            if (this.child2BarValue) this.child2BarValue.textContent = child2Earnings;
        }
    }

    updateChartVisibility() {
        const chartType = this.graphTypeSelect?.value || 'single-bar';
        
        const charts = {
            'single-bar': this.ctx,
            'line': this.lineCtx,
            'multi-bar': this.multiBarCtx
        };

        Object.entries(charts).forEach(([type, canvas]) => {
            if (canvas) {
                canvas.style.display = type === chartType ? 'block' : 'none';
            }
        });
    }

    // Chart update methods - these will be called by external chart management
    updateCharts() {
        // This method will be implemented to update all charts
        // Will be called from external chart management functions
        this.updateChartSelection(appState.selectedInvestment);
    }

    updateChartSelection(selectedIndex) {
        // This method will be implemented to update chart highlighting
        // Will be called from external chart management functions
        console.log('Updating chart selection to index:', selectedIndex);
    }

    // Progress and navigation UI methods
    updateProgressBar() {
        const progressBar = document.querySelector('.progress-bar');
        const progressText = document.getElementById('progress-text');
        
        if (progressBar && appState.sliderState.totalScenarios) {
            const currentScenario = appState.sliderState.currentIndex + 1;
            const percentage = Math.round((currentScenario / appState.sliderState.totalScenarios) * 100);
            
            progressBar.style.width = `${percentage}%`;
            
            const progressContainer = progressBar.parentElement;
            if (progressContainer) {
                progressContainer.setAttribute('aria-valuenow', percentage);
            }
            
            if (progressText) {
                progressText.textContent = `${currentScenario}/${appState.sliderState.totalScenarios}`;
            }
            
            console.log(`Progress updated: scenario ${currentScenario}/${appState.sliderState.totalScenarios} (${percentage}%)`);
        }
    }

    updateCurrentScenarioDisplay() {
        const currentScenarioElement = document.getElementById('current-scenario-display');
        if (currentScenarioElement && appState.sliderState.currentScenarioNumber !== null) {
            const scenario = SCENARIOS[appState.sliderState.currentScenarioNumber];
            if (scenario) {
                currentScenarioElement.textContent = `${scenario.name} (σ=${scenario.sigma}, θ=${scenario.theta})`;
            }
        }
    }

    updateNextButtonText() {
        if (this.nextButton && appState.sliderState.totalScenarios) {
            if (appState.isLastScenario()) {
                this.nextButton.textContent = 'Finish';
            } else {
                this.nextButton.textContent = 'Next Scenario';
            }
        }
    }

    updateButtonVisibility() {
        if (this.prevButton && appState.sliderState.totalScenarios) {
            if (appState.sliderState.currentIndex > 0) {
                this.prevButton.style.display = 'block';
            } else {
                this.prevButton.style.display = 'none';
            }
        }
        
        this.updateNextButtonText();
    }

    // Restore UI state from saved response
    restoreUIFromResponse(response) {
        if (response && this.investmentSlider && this.child1Display && this.child2Display) {
            appState.setSelectedInvestment(response.child1investment);
            this.investmentSlider.value = response.child1investment;
            this.child1Display.textContent = response.child1investment;
            this.child2Display.textContent = ALLOCATABLE_BUDGET - response.child1investment;
        }
    }

    // Initialize all UI components
    initialize() {
        // Update session values from input fields if they exist
        if (this.child1Ability && this.child2Ability) {
            appState.updateSession({
                abilityScore1: parseInt(this.child1Ability.value),
                abilityScore2: parseInt(this.child2Ability.value)
            });
        }
        
        this.updateScenarioOptions();
        this.updateSessionDisplay();
        this.setupEventListeners();
        // Note: updateChartVisibility() and scenario computation now handled by main slider.js
    }
}

// Create and export singleton instance
export const uiManager = new UIManager();