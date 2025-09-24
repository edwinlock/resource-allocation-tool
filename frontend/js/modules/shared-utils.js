import { CONFIG } from './constants.js';

// Shared utilities for all session-related UI operations
export class SessionUIUtils {
    static formatDate(dateStr) {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleString();
    }

    static getStatusDisplay(status, showCompletionTime = false, completedAt = null) {
        if (status === 'completed') {
            const completionInfo = showCompletionTime && completedAt ? 
                `<br><small class="text-muted">${this.formatDate(completedAt)}</small>` : '';
            return `<span class="status-completed">${showCompletionTime ? 'Completed' : '✅ Completed'}</span>${completionInfo}`;
        } else if (status === 'in_progress') {
            return `<span class="status-in-progress">${showCompletionTime ? 'In Progress' : '🔄 In Progress'}</span>`;
        } else {
            return `<span class="status-not-started">${showCompletionTime ? 'Not Started' : '⏸️ Not Started'}</span>`;
        }
    }

    static showAlert(message, type, container = null) {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        const targetContainer = container || document.querySelector('.container');
        if (targetContainer) {
            targetContainer.insertBefore(alertDiv, targetContainer.firstChild);
        }
        
        // Auto-dismiss after configured timeout
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, CONFIG.ALERT_TIMEOUT_MS);
    }

    static showSuccess(message, container = null) {
        this.showAlert(message, 'success', container);
    }

    static showError(message, container = null) {
        this.showAlert(message, 'danger', container);
    }

    static showModalError(message, modalId = 'createSessionModal') {
        const errorDisplay = document.getElementById('modalErrorDisplay');
        const errorMessage = document.getElementById('modalErrorMessage');
        
        if (errorDisplay && errorMessage) {
            errorMessage.textContent = message;
            errorDisplay.style.display = 'block';
            
            // Scroll the modal to show the error
            const modalBody = errorDisplay.closest('.modal-body');
            if (modalBody) {
                modalBody.scrollTop = 0;
            }
        }
    }

    static hideModalError() {
        const errorDisplay = document.getElementById('modalErrorDisplay');
        if (errorDisplay) {
            errorDisplay.style.display = 'none';
        }
    }

    static createErrorDisplay(error, options = {}) {
        const {
            title = '⚠️ Error',
            showDetails = true,
            actionButtons = [{ text: 'Return to Session Manager', href: 'index.html', class: 'btn-primary' }]
        } = options;

        const errorDiv = document.createElement('div');
        errorDiv.className = 'alert alert-danger mt-3';
        
        let html = `<h4>${title}</h4>`;
        
        if (showDetails) {
            html += `<p><strong>Error:</strong> ${error.message}</p>`;
        }
        
        if (actionButtons.length > 0) {
            html += '<div class="mt-3">';
            actionButtons.forEach(button => {
                html += `<a href="${button.href}" class="btn ${button.class} me-2">${button.text}</a>`;
            });
            html += '</div>';
        }
        
        errorDiv.innerHTML = html;
        return errorDiv;
    }

    static updateElementText(id, text) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = text;
        }
    }

    static updateElementHTML(id, html) {
        const element = document.getElementById(id);
        if (element) {
            element.innerHTML = html;
        }
    }
}