/**
 * Global Error Handler & Console Logger
 * Prevents app freeze from unhandled errors and captures console output
 */

// Store console logs in memory (last 500 entries)
const consoleLog = [];
const MAX_LOG_ENTRIES = 500;

function addLogEntry(type, args) {
    const timestamp = new Date().toISOString();
    const message = Array.from(args).map(arg => {
        if (typeof arg === 'object') {
            try {
                return JSON.stringify(arg, null, 2);
            } catch (e) {
                return String(arg);
            }
        }
        return String(arg);
    }).join(' ');

    consoleLog.push({ timestamp, type, message });
    if (consoleLog.length > MAX_LOG_ENTRIES) {
        consoleLog.shift(); // Remove oldest entry
    }
}

// Capture console methods
const originalConsole = {
    log: console.log,
    error: console.error,
    warn: console.warn,
    info: console.info
};

console.log = function(...args) {
    addLogEntry('log', args);
    originalConsole.log.apply(console, args);
};

console.error = function(...args) {
    addLogEntry('error', args);
    originalConsole.error.apply(console, args);
};

console.warn = function(...args) {
    addLogEntry('warn', args);
    originalConsole.warn.apply(console, args);
};

console.info = function(...args) {
    addLogEntry('info', args);
    originalConsole.info.apply(console, args);
};

// Handle unhandled promise rejections (most common cause of app freeze)
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    event.preventDefault(); // Prevent browser default handling
});

// Export function to show console logs
window.showConsoleLogs = function() {
    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.8);z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px;';

    const content = document.createElement('div');
    content.style.cssText = 'background:white;border-radius:8px;width:100%;max-width:900px;max-height:90vh;display:flex;flex-direction:column;';

    const header = document.createElement('div');
    header.style.cssText = 'padding:15px 20px;border-bottom:1px solid #ddd;display:flex;justify-content:space-between;align-items:center;';
    header.innerHTML = `<h5 style="margin:0;">Console Log (${consoleLog.length} entries)</h5>`;

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.style.cssText = 'border:none;background:none;font-size:24px;cursor:pointer;padding:0;width:30px;height:30px;';
    closeBtn.onclick = () => document.body.removeChild(modal);
    header.appendChild(closeBtn);

    const logContainer = document.createElement('pre');
    logContainer.style.cssText = 'flex:1;overflow:auto;padding:15px;margin:0;font-size:12px;font-family:monospace;';
    logContainer.textContent = consoleLog.map(entry =>
        `[${entry.timestamp}] [${entry.type.toUpperCase()}] ${entry.message}`
    ).join('\n\n');

    const footer = document.createElement('div');
    footer.style.cssText = 'padding:15px 20px;border-top:1px solid #ddd;display:flex;gap:10px;';

    const copyBtn = document.createElement('button');
    copyBtn.textContent = 'Copy to Clipboard';
    copyBtn.style.cssText = 'padding:8px 16px;background:#007bff;color:white;border:none;border-radius:4px;cursor:pointer;';
    copyBtn.onclick = () => {
        const text = consoleLog.map(entry =>
            `[${entry.timestamp}] [${entry.type.toUpperCase()}] ${entry.message}`
        ).join('\n\n');
        navigator.clipboard.writeText(text).then(() => {
            copyBtn.textContent = 'Copied!';
            setTimeout(() => copyBtn.textContent = 'Copy to Clipboard', 2000);
        });
    };

    const clearBtn = document.createElement('button');
    clearBtn.textContent = 'Clear Logs';
    clearBtn.style.cssText = 'padding:8px 16px;background:#dc3545;color:white;border:none;border-radius:4px;cursor:pointer;';
    clearBtn.onclick = () => {
        consoleLog.length = 0;
        logContainer.textContent = 'Console cleared';
    };

    footer.appendChild(copyBtn);
    footer.appendChild(clearBtn);

    content.appendChild(header);
    content.appendChild(logContainer);
    content.appendChild(footer);
    modal.appendChild(content);
    document.body.appendChild(modal);
};
