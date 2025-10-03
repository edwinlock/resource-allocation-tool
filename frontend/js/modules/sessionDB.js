import { generateUUID, getUTCDate } from './utilities.js';

// Session Database Manager - handles session-related database operations only
export class SessionDB {
    constructor() {
        this.db = null;
        this.initializeDatabase();
    }

    // Database initialization - sessions only
    initializeDatabase() {
        if (typeof Dexie === 'undefined') {
            console.warn('Dexie not available, running without database persistence');
            this.db = null;
            return;
        }

        try {
            this.db = new Dexie('SessionsDB');
            this.db.version(1).stores({
                sessions: 'id, participantId, enumeratorID, createdAt, child1SurveyStatus, child1SurveyCompletedAt, child2SurveyStatus, child2SurveyCompletedAt, treatmentSurveyStatus, treatmentSurveyCompletedAt, controlSurveyStatus, controlSurveyCompletedAt, sliderStartedAt, sliderCompletedAt, sliderStatus, child1ability, child2ability, child1name, child2name, school, sessionType, uploadedAt, uploadStatus, [participantId+enumeratorID]'
            });
            this.db.version(2).stores({
                sessions: 'id, participantId, enumeratorID, createdAt, child1SurveyStatus, child1SurveyCompletedAt, child2SurveyStatus, child2SurveyCompletedAt, treatmentSurveyStatus, treatmentSurveyCompletedAt, controlSurveyStatus, controlSurveyCompletedAt, exitSurveyStatus, exitSurveyCompletedAt, sliderStartedAt, sliderCompletedAt, sliderStatus, child1ability, child2ability, child1name, child2name, school, sessionType, uploadedAt, uploadStatus, [participantId+enumeratorID]'
            }).upgrade(tx => {
                // Add exitSurveyStatus and exitSurveyCompletedAt to existing sessions
                return tx.table('sessions').toCollection().modify(session => {
                    session.exitSurveyStatus = session.exitSurveyStatus || 'not_started';
                    session.exitSurveyCompletedAt = session.exitSurveyCompletedAt || null;
                });
            });
        } catch (error) {
            console.error('Failed to initialize SessionsDB:', error);
            this.db = null;
            throw new Error('Database initialization failed');
        }
    }

    async ensureOpen() {
        if (this.db && !this.db.isOpen()) {
            await this.db.open();
        }
    }

    async resetDatabase() {
        if (!this.db) return;

        try {
            if (this.db.isOpen()) {
                this.db.close();
            }
            await this.db.delete();
            this.initializeDatabase();
            await this.ensureOpen();
        } catch (error) {
            console.error('Error resetting database:', error);
            throw error;
        }
    }

    // Session CRUD operations
    async createSession(participantId, enumeratorId, child1Ability, child2Ability, child1Name, child2Name, school, sessionType) {
        if (!this.db) {
            throw new Error('Database not available');
        }


        await this.ensureOpen();
        
        // Check for existing session with same participant and enumerator
        const existingSession = await this.db.sessions
            .where('[participantId+enumeratorID]')
            .equals([participantId, enumeratorId])
            .first();
            
        if (existingSession) {
            throw new Error(`A session already exists for Participant "${participantId}" and Enumerator "${enumeratorId}". Each participant-enumerator combination can only have one session.`);
        }

        const sessionId = generateUUID();
        
        try {
            const sessionData = {
                id: sessionId,
                participantId: participantId,
                enumeratorID: enumeratorId,
                createdAt: getUTCDate(),
                child1SurveyStatus: 'not_started',
                child1SurveyCompletedAt: null,
                child2SurveyStatus: 'not_started',
                child2SurveyCompletedAt: null,
                treatmentSurveyStatus: 'not_started',
                treatmentSurveyCompletedAt: null,
                controlSurveyStatus: 'not_started',
                controlSurveyCompletedAt: null,
                exitSurveyStatus: 'not_started',
                exitSurveyCompletedAt: null,
                sliderStartedAt: null,
                sliderCompletedAt: null,
                sliderStatus: 'not_started',
                child1ability: child1Ability,
                child2ability: child2Ability,
                child1name: child1Name,
                child2name: child2Name,
                school: school,
                sessionType: sessionType,
                uploadedAt: null,
                uploadStatus: 'not_uploaded'
            };

            await this.db.sessions.add(sessionData);
        } catch (error) {
            if (error.name === 'ConstraintError') {
                throw new Error(`A session already exists for Participant "${participantId}" and Enumerator "${enumeratorId}". Each participant-enumerator combination can only have one session.`);
            }
            throw error;
        }
        
        return sessionId;
    }

    async loadSessions() {
        if (!this.db) return [];

        try {
            await this.ensureOpen();
            return await this.db.sessions.orderBy('id').reverse().toArray();
        } catch (error) {
            console.error('Error loading sessions:', error);
            throw error;
        }
    }

    async getSession(sessionId) {
        if (!this.db) return null;
        
        try {
            await this.ensureOpen();
            return await this.db.sessions.get(sessionId);
        } catch (error) {
            console.error('Error getting session:', error);
            throw error;
        }
    }

    async updateSessionStatus(sessionId, updates) {
        if (!this.db) return;
        
        try {
            await this.ensureOpen();
            await this.db.sessions.update(sessionId, updates);
        } catch (error) {
            console.error('Error updating session:', error);
            throw error;
        }
    }

    async deleteSession(sessionId) {
        if (!this.db) return;
        
        try {
            await this.ensureOpen();
            await this.db.sessions.delete(sessionId);
            // Note: Response deletion is handled by SliderResponseDB
        } catch (error) {
            console.error('Error deleting session:', error);
            throw error;
        }
    }

    // Helper methods for UI operations
    async markSurveyStarted(sessionId) {
        await this.updateSessionStatus(sessionId, {
            surveyStartedAt: getUTCDate(),
            surveyStatus: 'in_progress'
        });
    }

    async markSliderStarted(sessionId) {
        await this.updateSessionStatus(sessionId, {
            sliderStartedAt: getUTCDate(),
            sliderStatus: 'in_progress'
        });
    }

    async markSliderCompleted(sessionId) {
        await this.updateSessionStatus(sessionId, {
            sliderCompletedAt: getUTCDate(),
            sliderStatus: 'completed'
        });
    }
}

// Create and export singleton instance
export const sessionDB = new SessionDB();

