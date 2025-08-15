// Utility Functions
export function getUTCDate() {
    return new Date().toISOString();
}

export function generateUUID() {
    return crypto.randomUUID();
}

// Array shuffling utility (moved from app-state.js for reusability)
export function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}