import { CONFIG } from './constants.js';
import { SCENARIOS } from './scenario-loader.js';
import { appState } from './app-state.js';

const { ALLOCATABLE_BUDGET } = CONFIG;

// DOM element management and event handlers
export class UIManager {
    constructor() {
        this.initializeDOMElements();
    }

    initializeDOMElements() {
        // UI elements
        this.investmentSlider = document.getElementById('investment-slider');
        this.child1Display = document.getElementById('child1-display');
        this.child2Display = document.getElementById('child2-display');

        // Chart canvases
        this.ctx = document.getElementById('single-bar-chart-canvas');
        this.lineCtx = document.getElementById('line-chart-canvas');
        this.multiBarCtx = document.getElementById('multi-bar-chart-canvas');
        this.graphTypeSelect = document.getElementById('graph-type-select');

        // Session navigation buttons
        this.nextButton = document.getElementById('nextButton');
        this.prevButton = document.getElementById('prevButton');
    }


    // Event handlers
    setupEventListeners() {
        if (this.investmentSlider) {
            this.investmentSlider.addEventListener('input', this.onSliderChange.bind(this));
        }

        if (this.graphTypeSelect) {
            this.graphTypeSelect.addEventListener('change', this.onGraphTypeChange.bind(this));
        }
    }

    onSliderChange(event) {
        const value = parseInt(event.target.value);

        // Mark slider as touched and enable next button
        if (!this.investmentSlider.classList.contains('slider-touched')) {
            this.investmentSlider.classList.add('slider-touched');
            appState.markSliderTouched();
            this.enableNextButton();
        }

        appState.setSelectedInvestment(value);
        this.updateDisplays();
        this.updateChartSelection(value);
    }

    onGraphTypeChange() {
        this.updateChartVisibility();
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

    // Chart updates are handled by ChartManager - no chart methods needed here

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
            
        }
    }

    updateCurrentScenarioDisplay() {
        // Current scenario display removed from HTML
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
            // Mark slider as touched since we're restoring a saved response
            this.investmentSlider.classList.add('slider-touched');
            appState.markSliderTouched();
            this.enableNextButton();
        }
    }

    // Enable/disable next button based on slider interaction
    enableNextButton() {
        if (this.nextButton) {
            this.nextButton.disabled = false;
        }
    }

    disableNextButton() {
        if (this.nextButton) {
            this.nextButton.disabled = true;
        }
    }

    // Reset slider state for new scenario
    resetSliderForNewScenario() {
        if (this.investmentSlider) {
            this.investmentSlider.classList.remove('slider-touched');
            appState.resetSliderTouched();
            this.disableNextButton();
        }
    }

    // Navigation handlers for slider app - UI only
    async handleNextButtonClick(sessionManager) {
        try {
            // Use SessionManager for business logic
            const result = await sessionManager.processNextScenario();

            if (result.completed) {
                // Session completed - redirect based on dummy mode
                const sessionId = appState.sliderState.sessionId;
                const isDummyMode = result.isDummyMode || false;

                if (isDummyMode) {
                    // Dummy slider complete - go to sandwich survey
                    window.location.href = `survey.html?survey_id=Sandwich&session_id=${sessionId}`;
                } else {
                    // Real slider complete - go to exit survey
                    window.location.href = `survey.html?survey_id=Exit&session_id=${sessionId}`;
                }
            }

            return result;
        } catch (error) {
            console.error('Error processing response:', error);
            throw error;
        }
    }

    async handlePrevButtonClick(sessionManager) {
        try {
            // Use SessionManager for business logic
            return await sessionManager.processPreviousScenario();
        } catch (error) {
            console.error('Error going to previous scenario:', error);
            throw error;
        }
    }

    // Button event handlers setup for slider app
    setupScenarioHandlers(sessionManager, chartUpdateCallback) {
        if (!this.nextButton) {
            throw new Error('nextButton element not found in DOM');
        }
        
        if (!this.prevButton) {
            throw new Error('prevButton element not found in DOM');
        }
        
        // Handle next button click
        this.nextButton.addEventListener('click', async () => {
            const result = await this.handleNextButtonClick(sessionManager);

            if (!result.completed) {
                // Reset slider state for new scenario
                this.resetSliderForNewScenario();

                // Update charts and UI
                if (chartUpdateCallback) {
                    chartUpdateCallback();
                }
                this.updateProgressBar();
                this.updateCurrentScenarioDisplay();
                this.updateButtonVisibility();
            }
        });
        
        // Handle previous button click
        this.prevButton.addEventListener('click', async () => {
            const result = await this.handlePrevButtonClick(sessionManager);
            
            // Update charts and UI
            if (chartUpdateCallback) {
                chartUpdateCallback();
            }
            this.updateProgressBar();
            this.updateCurrentScenarioDisplay();
            this.updateButtonVisibility();
            
            // Restore the previous response if it exists
            if (result.savedResponse) {
                this.restoreUIFromResponse(result.savedResponse);
                if (chartUpdateCallback) {
                    chartUpdateCallback(); // Update charts with restored slider position
                }
            }
        });
    }

    // Initialize all UI components
    initialize() {
        // Initialize slider state - reset touch state and disable next button
        appState.resetSliderTouched();
        this.disableNextButton();

        this.setupEventListeners();
        // Note: updateChartVisibility() and scenario computation now handled by main slider.js
    }
}

// Create and export singleton instance
export const uiManager = new UIManager();