import { generateUUID } from './utilities.js';

// Base SurveyQuestion class
export class SurveyQuestion {
    constructor(questionData) {
        this.questionId = questionData.question_id;
        this.type = questionData.type;
        this.query = questionData.query || '';
        this.datatype = questionData.datatype || 'text';
        this.required = questionData.required || false;
    }

    // Abstract method to be implemented by subclasses
    render(variables = {}) {
        throw new Error('render() method must be implemented by subclass');
    }

    // Abstract method to extract value from rendered form
    getValue() {
        throw new Error('getValue() method must be implemented by subclass');
    }

    // Common method to substitute variables in text
    substituteVariables(text, variables = {}) {
        if (!text) return '';
        return text.replace(/{(\w+)}/g, (match, key) => variables[key] || match);
    }

    // Validate the answer based on datatype and required status
    validate(answer) {
        if (this.required && (answer === null || answer === undefined || answer === '')) {
            return { valid: false, message: 'This field is required' };
        }

        if (answer !== null && answer !== undefined && answer !== '') {
            if (this.datatype === 'number' && isNaN(answer)) {
                return { valid: false, message: 'Please enter a valid number' };
            }
        }

        return { valid: true };
    }
}

// Open question - single text input
export class OpenQuestion extends SurveyQuestion {
    render(variables = {}) {
        const query = this.substituteVariables(this.query, variables);
        const inputType = this.datatype === 'number' ? 'number' : 'text';
        const requiredAttr = this.required ? 'required' : '';

        return `
            <div class="mb-4">
                <fieldset>
                    <legend class="question-query">${query}</legend>
                    <input type="${inputType}" class="form-control" id="q_${this.questionId}"
                           data-question-id="${this.questionId}" ${requiredAttr}>
                </fieldset>
            </div>
        `;
    }

    getValue() {
        const element = document.getElementById(`q_${this.questionId}`);
        if (!element) return null;

        const value = element.value.trim();
        if (this.datatype === 'number') {
            return value === '' ? null : parseFloat(value);
        }
        return value === '' ? null : value;
    }
}

// Multi-open question - multiple text inputs with prefixes
export class MultiOpenQuestion extends SurveyQuestion {
    constructor(questionData) {
        super(questionData);
        this.prefixes = questionData.prefixes || [];
    }

    render(variables = {}) {
        const query = this.substituteVariables(this.query, variables);
        const inputType = this.datatype === 'number' ? 'number' : 'text';
        const requiredAttr = this.required ? 'required' : '';

        let html = `
            <div class="mb-4">
                <fieldset>
                    <legend class="question-query">${query}</legend>
        `;

        this.prefixes.forEach((prefix, index) => {
            const substitutedPrefix = this.substituteVariables(prefix, variables);
            html += `
                <div class="row mb-2">
                    <div class="col-sm-4">
                        <label for="q_${this.questionId}_${index}" class="form-label">${substitutedPrefix}</label>
                    </div>
                    <div class="col-sm-8">
                        <input type="${inputType}" class="form-control" id="q_${this.questionId}_${index}"
                               data-question-id="${this.questionId}" data-index="${index}" ${requiredAttr}>
                    </div>
                </div>
            `;
        });

        html += `
                </fieldset>
            </div>
        `;
        return html;
    }

    getValue() {
        const values = [];
        this.prefixes.forEach((_, index) => {
            const element = document.getElementById(`q_${this.questionId}_${index}`);
            if (element) {
                const value = element.value.trim();
                if (this.datatype === 'number') {
                    values.push(value === '' ? null : parseFloat(value));
                } else {
                    values.push(value === '' ? null : value);
                }
            }
        });
        return values.length > 0 ? values : null;
    }

    validate(answer) {
        // For multiopen questions, answer is an array
        if (this.required && (answer === null || answer === undefined || (Array.isArray(answer) && answer.every(v => v === null)))) {
            return { valid: false, message: 'This field is required' };
        }

        if (Array.isArray(answer) && this.datatype === 'number') {
            // Check each individual value in the array for number validity
            for (let value of answer) {
                if (value !== null && value !== undefined && value !== '' && isNaN(value)) {
                    return { valid: false, message: 'Please enter a valid number' };
                }
            }
        }

        return { valid: true };
    }
}

// Single select question - radio buttons
export class SingleSelectQuestion extends SurveyQuestion {
    constructor(questionData) {
        super(questionData);
        this.values = questionData.values || [];
        this.image = questionData.image || null;
    }

    render(variables = {}) {
        const query = this.substituteVariables(this.query, variables);
        const requiredAttr = this.required ? 'required' : '';

        let html = `
            <div class="mb-4">
                <fieldset>
                    <legend class="question-query">${query}</legend>
        `;

        // Display image if provided
        if (this.image) {
            const imagePath = this.image.startsWith('http://') || this.image.startsWith('https://') || this.image.startsWith('/')
                ? this.image
                : `surveys/${this.image}`;
            html += `
                <div class="text-center mb-3">
                    <img src="${imagePath}" alt="Question image" class="img-fluid" style="max-height: 400px; border-radius: 8px;">
                </div>
            `;
        }

        // Horizontal layout when image is present, vertical otherwise
        if (this.image) {
            html += `<div class="row justify-content-center">`;
            this.values.forEach((value, index) => {
                const displayValue = this.substituteVariables(String(value), variables);
                html += `
                    <div class="col-auto mb-2">
                        <div class="form-check">
                            <input class="form-check-input survey-option-input" type="radio" name="q_${this.questionId}"
                                   id="q_${this.questionId}_${index}" value="${value}"
                                   data-question-id="${this.questionId}" ${requiredAttr}>
                            <label class="form-check-label survey-option-label" for="q_${this.questionId}_${index}">
                                ${displayValue}
                            </label>
                        </div>
                    </div>
                `;
            });
            html += `</div>`;
        } else {
            // Vertical layout without image
            this.values.forEach((value, index) => {
                const displayValue = this.substituteVariables(String(value), variables);
                html += `
                    <div class="form-check">
                        <input class="form-check-input" type="radio" name="q_${this.questionId}"
                               id="q_${this.questionId}_${index}" value="${value}"
                               data-question-id="${this.questionId}" ${requiredAttr}>
                        <label class="form-check-label" for="q_${this.questionId}_${index}">
                            ${displayValue}
                        </label>
                    </div>
                `;
            });
        }

        html += `
                </fieldset>
            </div>
        `;
        return html;
    }

    getValue() {
        const selectedElement = document.querySelector(`input[name="q_${this.questionId}"]:checked`);
        if (!selectedElement) return null;

        const value = selectedElement.value;
        if (this.datatype === 'number') {
            return parseFloat(value);
        }
        return value;
    }
}

// Multi select question - checkboxes
export class MultiSelectQuestion extends SurveyQuestion {
    constructor(questionData) {
        super(questionData);
        this.values = questionData.values || [];
        this.image = questionData.image || null;
    }

    render(variables = {}) {
        const query = this.substituteVariables(this.query, variables);
        const requiredAttr = this.required ? 'required' : '';

        let html = `
            <div class="mb-4">
                <fieldset>
                    <legend class="question-query">${query}</legend>
        `;

        // Display image if provided
        if (this.image) {
            const imagePath = this.image.startsWith('http://') || this.image.startsWith('https://') || this.image.startsWith('/')
                ? this.image
                : `surveys/${this.image}`;
            html += `
                <div class="text-center mb-3">
                    <img src="${imagePath}" alt="Question image" class="img-fluid" style="max-height: 400px; border-radius: 8px;">
                </div>
            `;
        }

        // Horizontal layout when image is present, vertical otherwise
        if (this.image) {
            html += `<div class="row justify-content-center">`;
            this.values.forEach((value, index) => {
                const displayValue = this.substituteVariables(String(value), variables);
                html += `
                    <div class="col-auto mb-2">
                        <div class="form-check">
                            <input class="form-check-input survey-option-input" type="checkbox"
                                   id="q_${this.questionId}_${index}" value="${value}"
                                   data-question-id="${this.questionId}" data-index="${index}">
                            <label class="form-check-label survey-option-label" for="q_${this.questionId}_${index}">
                                ${displayValue}
                            </label>
                        </div>
                    </div>
                `;
            });
            html += `</div>`;
        } else {
            // Vertical layout without image
            this.values.forEach((value, index) => {
                const displayValue = this.substituteVariables(String(value), variables);
                html += `
                    <div class="form-check">
                        <input class="form-check-input" type="checkbox"
                               id="q_${this.questionId}_${index}" value="${value}"
                               data-question-id="${this.questionId}" data-index="${index}">
                        <label class="form-check-label" for="q_${this.questionId}_${index}">
                            ${displayValue}
                        </label>
                    </div>
                `;
            });
        }

        html += `
                </fieldset>
            </div>
        `;
        return html;
    }

    getValue() {
        const selectedValues = [];
        this.values.forEach((value, index) => {
            const element = document.getElementById(`q_${this.questionId}_${index}`);
            if (element && element.checked) {
                if (this.datatype === 'number') {
                    selectedValues.push(parseFloat(value));
                } else {
                    selectedValues.push(value);
                }
            }
        });
        return selectedValues.length > 0 ? selectedValues : null;
    }

    validate() {
        // Multiselect questions are always valid - selecting nothing is perfectly acceptable
        return { valid: true };
    }
}

// Grid question - table with radio buttons (no automatic selection logic)
export class GridQuestion extends SurveyQuestion {
    constructor(questionData) {
        super(questionData);
        this.options = questionData.options || [];
        this.prefixes = questionData.prefixes || [];
    }

    render(variables = {}) {
        const query = this.substituteVariables(this.query, variables);
        const requiredAttr = this.required ? 'required' : '';

        let html = `
            <div class="mb-4">
                <fieldset>
                    <legend class="question-query">${query}</legend>
                    <div class="table-responsive">
                        <table class="table table-bordered">
                            <tbody>
        `;

        this.prefixes.forEach((prefix, rowIndex) => {
            const substitutedPrefix = this.substituteVariables(prefix, variables);
            html += `<tr><td class="fw-bold">${substitutedPrefix}</td>`;

            if (this.options[rowIndex]) {
                this.options[rowIndex].forEach((option, colIndex) => {
                    const displayOption = this.substituteVariables(String(option), variables);
                    html += `
                        <td class="text-center">
                            <div class="form-check">
                                <input class="form-check-input survey-option-input" type="radio"
                                       name="q_${this.questionId}_row_${rowIndex}"
                                       id="q_${this.questionId}_${rowIndex}_${colIndex}"
                                       value="${option}"
                                       data-question-id="${this.questionId}"
                                       data-row="${rowIndex}" data-col="${colIndex}" ${requiredAttr}>
                                <label class="form-check-label survey-option-label" for="q_${this.questionId}_${rowIndex}_${colIndex}">
                                    ${displayOption}
                                </label>
                            </div>
                        </td>
                    `;
                });
            }
            html += `</tr>`;
        });

        html += `
                            </tbody>
                        </table>
                    </div>
                </fieldset>
            </div>
        `;

        return html;
    }

    getValue() {
        const values = [];
        this.prefixes.forEach((_, rowIndex) => {
            const selectedElement = document.querySelector(`input[name="q_${this.questionId}_row_${rowIndex}"]:checked`);
            if (selectedElement) {
                values.push(selectedElement.value);
            } else {
                values.push(null);
            }
        });
        return values.some(v => v !== null) ? values : null;
    }
}

// MPL (Multiple Price List) question - grid of radio buttons
export class MPLQuestion extends SurveyQuestion {
    constructor(questionData) {
        super(questionData);
        this.options = questionData.options || [];
        this.prefixes = questionData.prefixes || [];
    }

    render(variables = {}) {
        const query = this.substituteVariables(this.query, variables);
        const requiredAttr = this.required ? 'required' : '';

        let html = `
            <div class="mb-4">
                <fieldset>
                    <legend class="question-query">${query}</legend>
                    <div class="table-responsive">
                        <table class="table table-bordered">
                            <tbody>
        `;

        this.prefixes.forEach((prefix, rowIndex) => {
            const substitutedPrefix = this.substituteVariables(prefix, variables);
            html += `<tr><td class="fw-bold">${substitutedPrefix}</td>`;

            if (this.options[rowIndex]) {
                this.options[rowIndex].forEach((option, colIndex) => {
                    const displayOption = this.substituteVariables(String(option), variables);
                    html += `
                        <td class="text-center">
                            <div class="form-check">
                                <input class="form-check-input survey-option-input" type="radio"
                                       name="q_${this.questionId}_row_${rowIndex}"
                                       id="q_${this.questionId}_${rowIndex}_${colIndex}"
                                       value="${option}"
                                       data-question-id="${this.questionId}"
                                       data-row="${rowIndex}" data-col="${colIndex}" ${requiredAttr}>
                                <label class="form-check-label survey-option-label" for="q_${this.questionId}_${rowIndex}_${colIndex}">
                                    ${displayOption}
                                </label>
                            </div>
                        </td>
                    `;
                });
            }
            html += `</tr>`;
        });

        html += `
                            </tbody>
                        </table>
                    </div>
                </fieldset>
            </div>
        `;

        // Add automatic selection logic after rendering
        setTimeout(() => this.setupEventListeners(), 0);

        return html;
    }

    setupEventListeners() {
        // Add event listeners to all radio buttons in this MPL question
        this.prefixes.forEach((_, rowIndex) => {
            const radioButtons = document.querySelectorAll(`input[name="q_${this.questionId}_row_${rowIndex}"]`);
            radioButtons.forEach(radio => {
                radio.addEventListener('change', (event) => {
                    if (event.target.checked) {
                        this.handleMPLSelection(rowIndex, event.target.value);
                    }
                });
            });
        });
    }

    handleMPLSelection(selectedRow, selectedValue) {
        // 1. The clicked row keeps its selection (already handled by browser)

        // 2. Set all rows above to "yes" (first option)
        for (let row = 0; row < selectedRow; row++) {
            const yesRadio = document.querySelector(`input[name="q_${this.questionId}_row_${row}"][value="${this.options[row]?.[0]}"]`);
            if (yesRadio) {
                yesRadio.checked = true;
            }
        }

        // 3. Set all rows below to "no" (second option)
        for (let row = selectedRow + 1; row < this.prefixes.length; row++) {
            const noRadio = document.querySelector(`input[name="q_${this.questionId}_row_${row}"][value="${this.options[row]?.[1]}"]`);
            if (noRadio) {
                noRadio.checked = true;
            }
        }
    }

    getValue() {
        const values = [];
        this.prefixes.forEach((_, rowIndex) => {
            const selectedElement = document.querySelector(`input[name="q_${this.questionId}_row_${rowIndex}"]:checked`);
            if (selectedElement) {
                values.push(selectedElement.value);
            } else {
                values.push(null);
            }
        });
        return values.some(v => v !== null) ? values : null;
    }
}

// Plain text question - display only
export class PlainTextQuestion extends SurveyQuestion {
    constructor(questionData) {
        super(questionData);
        this.text = questionData.text || '';
    }

    render(variables = {}) {
        const text = this.substituteVariables(this.text, variables);
        return `
            <div class="mb-4">
                <div class="plaintext-display">
                    ${text}
                </div>
            </div>
        `;
    }

    getValue() {
        // Plain text questions don't have values
        return null;
    }

    validate() {
        // Plain text questions are always valid
        return { valid: true };
    }
}

// Consent question - checkbox with consent text and required agreement
export class ConsentQuestion extends SurveyQuestion {
    constructor(questionData) {
        super(questionData);
        this.text = questionData.text || '';
        this.required = true; // Consent questions are always required
    }

    render(variables = {}) {
        const text = this.substituteVariables(this.text, variables);
        const query = this.substituteVariables(this.query, variables);

        return `
            <div class="mb-4 pb-4" style="border-bottom: 2px solid #dee2e6;">
                <div class="consent-text" style="border: 1px solid #dee2e6; padding: 1rem; background-color: #f8f9fa;">
                    ${text}
                    <div class="form-check mt-3">
                        <input class="form-check-input survey-option-input" type="checkbox"
                               id="q_${this.questionId}"
                               data-question-id="${this.questionId}"
                               required>
                        <label class="form-check-label fw-bold" for="q_${this.questionId}">
                            ${query || 'I have read and agree to the terms above'}
                        </label>
                    </div>
                </div>
            </div>
        `;
    }

    getValue() {
        const element = document.getElementById(`q_${this.questionId}`);
        return element ? element.checked : false;
    }

    validate(answer) {
        if (!answer) {
            return {
                valid: false,
                message: 'You must agree to the consent form to continue'
            };
        }
        return { valid: true };
    }
}

// Likert scale question - single scale with customizable range
export class LikertQuestion extends SurveyQuestion {
    constructor(questionData) {
        super(questionData);
        this.min = questionData.min !== undefined ? questionData.min : 0;
        this.max = questionData.max !== undefined ? questionData.max : 5;
        this.prefix = questionData.prefix || '';
    }

    render(variables = {}) {
        const query = this.substituteVariables(this.query, variables);
        const prefix = this.substituteVariables(this.prefix, variables);
        const requiredAttr = this.required ? 'required' : '';

        let html = `
            <div class="mb-4">
                <fieldset>
                    <legend class="question-query">${query}</legend>
                    ${prefix ? `<div class="mb-3 text-muted">${prefix}</div>` : ''}
                    <div class="likert-scale">
                        <div class="d-flex justify-content-center">
                            <div class="d-flex gap-3">
        `;

        // Generate radio buttons for the scale
        for (let i = this.min; i <= this.max; i++) {
            html += `
                <div class="form-check">
                    <input class="form-check-input" type="radio"
                           name="q_${this.questionId}"
                           id="q_${this.questionId}_${i}"
                           value="${i}"
                           data-question-id="${this.questionId}" ${requiredAttr}>
                    <label class="form-check-label" for="q_${this.questionId}_${i}">
                        ${i}
                    </label>
                </div>
            `;
        }

        html += `
                            </div>
                        </div>
                    </div>
                </fieldset>
            </div>
        `;

        return html;
    }

    getValue() {
        const selectedElement = document.querySelector(`input[name="q_${this.questionId}"]:checked`);
        return selectedElement ? parseInt(selectedElement.value) : null;
    }
}

// Multi-Likert question - multiple likert scales with same range
export class MultiLikertQuestion extends SurveyQuestion {
    constructor(questionData) {
        super(questionData);
        this.min = questionData.min !== undefined ? questionData.min : 0;
        this.max = questionData.max !== undefined ? questionData.max : 5;
        this.prefixes = questionData.prefixes || [];
    }

    render(variables = {}) {
        const query = this.substituteVariables(this.query, variables);
        const requiredAttr = this.required ? 'required' : '';

        let html = `
            <div class="mb-4">
                <fieldset>
                    <legend class="question-query">${query}</legend>
                    <div class="table-responsive">
                        <table class="table table-borderless">
                            <thead>
                                <tr>
                                    <th style="width: 40%;"></th>
        `;

        // Header with scale numbers
        for (let i = this.min; i <= this.max; i++) {
            html += `<th class="text-center" style="width: ${60 / (this.max - this.min + 1)}%;">${i}</th>`;
        }

        html += `
                                </tr>
                            </thead>
                            <tbody>
        `;

        // Generate rows for each prefix
        this.prefixes.forEach((prefix, rowIndex) => {
            const displayPrefix = this.substituteVariables(prefix, variables);
            html += `
                <tr>
                    <td class="align-middle">
                        <strong>${displayPrefix}</strong>
                    </td>
            `;

            // Generate radio buttons for each scale value
            for (let i = this.min; i <= this.max; i++) {
                html += `
                    <td class="text-center">
                        <div class="form-check d-inline-block">
                            <input class="form-check-input survey-option-input" type="radio"
                                   name="q_${this.questionId}_row_${rowIndex}"
                                   id="q_${this.questionId}_${rowIndex}_${i}"
                                   value="${i}"
                                   data-question-id="${this.questionId}"
                                   data-row="${rowIndex}" ${requiredAttr}>
                            <label class="form-check-label visually-hidden" for="q_${this.questionId}_${rowIndex}_${i}">
                                ${displayPrefix} - ${i}
                            </label>
                        </div>
                    </td>
                `;
            }

            html += `</tr>`;
        });

        html += `
                            </tbody>
                        </table>
                    </div>
                </fieldset>
            </div>
        `;

        return html;
    }

    getValue() {
        const values = [];
        this.prefixes.forEach((_, rowIndex) => {
            const selectedElement = document.querySelector(`input[name="q_${this.questionId}_row_${rowIndex}"]:checked`);
            if (selectedElement) {
                values.push(parseInt(selectedElement.value));
            } else {
                values.push(null);
            }
        });
        return values.some(v => v !== null) ? values : null;
    }

    validate(answer) {
        if (this.required && (!answer || answer.every(v => v === null))) {
            return {
                valid: false,
                message: `Please answer all parts of: ${this.query}`
            };
        }
        return { valid: true };
    }
}

// Factory function to create appropriate question instance
export function createQuestion(questionData) {
    switch (questionData.type) {
        case 'open':
            return new OpenQuestion(questionData);
        case 'multiopen':
            return new MultiOpenQuestion(questionData);
        case 'singleselect':
            return new SingleSelectQuestion(questionData);
        case 'multiselect':
            return new MultiSelectQuestion(questionData);
        case 'grid':
            return new GridQuestion(questionData);
        case 'mpl':
            return new MPLQuestion(questionData);
        case 'plaintext':
            return new PlainTextQuestion(questionData);
        case 'consent':
            return new ConsentQuestion(questionData);
        case 'likert':
            return new LikertQuestion(questionData);
        case 'multilikert':
            return new MultiLikertQuestion(questionData);
        default:
            throw new Error(`Unknown question type: ${questionData.type}`);
    }
}

// Survey class - manages collection of questions
export class Survey {
    constructor(surveyData) {
        this.surveyId = surveyData.survey_id;
        this.name = surveyData.name;
        this.questions = surveyData.questions.map(q => createQuestion(q));
    }

    render(variables = {}) {
        let html = `
            <div class="survey-container">
                <h2 class="mb-4">${this.name}</h2>
                <form id="survey-form">
        `;

        this.questions.forEach(question => {
            html += question.render(variables);
        });

        html += `
                    <div class="d-flex justify-content-between mt-4">
                        <button type="button" class="btn btn-secondary" id="survey-back-btn">
                            ← Back to Session Manager
                        </button>
                        <button type="submit" class="btn btn-primary" id="survey-submit-btn">
                            Submit Survey
                        </button>
                    </div>
                </form>
            </div>
        `;

        return html;
    }

    // Collect all responses from the form
    getAllResponses() {
        const responses = {};
        let allValid = true;
        const errors = [];

        this.questions.forEach(question => {
            const value = question.getValue();
            const validation = question.validate(value);

            if (!validation.valid) {
                allValid = false;
                errors.push({
                    questionId: question.questionId,
                    message: validation.message
                });
            }

            // Only store non-null values
            if (value !== null) {
                responses[question.questionId] = value;
            }
        });

        return {
            responses,
            valid: allValid,
            errors
        };
    }

    // Validate all questions
    validate() {
        const result = this.getAllResponses();
        return {
            valid: result.valid,
            errors: result.errors
        };
    }
}

// Survey Manager class - handles loading and coordination
export class SurveyManager {
    constructor() {
        this.currentSurvey = null;
        this.sessionId = null;
        this.surveyId = null;
    }

    // Load survey from JSON file
    async loadSurvey(surveyId) {
        try {
            // Map Child1 and Child2 to use the same Child survey file
            const fileId = (surveyId === 'Child1' || surveyId === 'Child2') ? 'Child' : surveyId;

            const response = await fetch(`surveys/survey${fileId}.json`);
            if (!response.ok) {
                throw new Error(`Failed to load survey: ${response.status}`);
            }
            const surveyData = await response.json();
            this.currentSurvey = new Survey(surveyData);
            this.surveyId = surveyId; // Keep original surveyId (Child1 or Child2)
            return this.currentSurvey;
        } catch (error) {
            console.error('Error loading survey:', error);
            const fileId = (surveyId === 'Child1' || surveyId === 'Child2') ? 'Child' : surveyId;
            throw new Error(`Could not load survey${fileId}.json: ${error.message}`);
        }
    }

    // Initialize from URL parameters
    async initializeFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        this.sessionId = urlParams.get('session_id');
        this.surveyId = urlParams.get('survey_id'); // Optional - can be inferred from session

        if (!this.sessionId) {
            throw new Error('No session_id provided in URL');
        }

        // If surveyId not provided, detect from session type
        if (!this.surveyId) {
            const { sessionManager } = await import('./session-coordinator.js');
            const session = await sessionManager.getSession(this.sessionId);

            if (!session) {
                throw new Error('Session not found');
            }

            if (session.sessionType === 'child') {
                this.surveyId = 'Child';
            } else if (session.sessionType === 'parent') {
                // For parent sessions, use Treatment or Control based on group type
                this.surveyId = session.groupType === 'treatment' ? 'Treatment' : 'Control';
            } else {
                throw new Error(`Unknown session type: ${session.sessionType}`);
            }
        }

        return { sessionId: this.sessionId, surveyId: this.surveyId };
    }

    // Render survey with session variables
    async renderSurvey(variables = {}) {
        if (!this.currentSurvey) {
            throw new Error('No survey loaded');
        }
        return this.currentSurvey.render(variables);
    }

    // Get survey responses
    getSurveyResponses() {
        if (!this.currentSurvey) {
            throw new Error('No survey loaded');
        }
        return this.currentSurvey.getAllResponses();
    }

    // Validate current survey
    validateSurvey() {
        if (!this.currentSurvey) {
            throw new Error('No survey loaded');
        }
        return this.currentSurvey.validate();
    }
}