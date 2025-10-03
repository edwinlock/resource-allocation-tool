import { generateUUID, getUTCDate } from './utilities.js';

// Survey Response Database Manager - handles survey response-related database operations only
export class SurveyResponseDB {
    constructor() {
        this.db = null;
        this.initializeDatabase();
    }

    // Database initialization - survey responses only
    initializeDatabase() {
        if (typeof Dexie === 'undefined') {
            console.warn('Dexie not available, running without database persistence');
            this.db = null;
            return;
        }

        try {
            this.db = new Dexie('SurveyResponsesDB');
            this.db.version(1).stores({
                surveyResponses: 'id, sessionId, surveyId, questionId, answer, completedAt'
            });
            this.db.version(2).stores({
                surveyResponses: 'id, sessionId, surveyId, questionId, answer, completedAt, [sessionId+surveyId]'
            });
        } catch (error) {
            console.error('Failed to initialize SurveyResponsesDB:', error);
            this.db = null;
            throw new Error('Database initialization failed');
        }
    }

    async ensureOpen() {
        if (this.db && !this.db.isOpen()) {
            await this.db.open();
        }
    }

    // Survey Response CRUD operations
    async saveAllResponses(sessionId, surveyId, responses) {
        if (!this.db) return;

        await this.ensureOpen();

        // First, delete any existing responses for this session+survey combination
        // This handles the case where a user retakes a survey
        await this.db.surveyResponses
            .where(['sessionId', 'surveyId'])
            .equals([sessionId, surveyId])
            .delete();

        // Convert responses object to database records
        const responseRecords = Object.entries(responses).map(([questionId, answer]) => ({
            id: generateUUID(),
            sessionId,
            surveyId,
            questionId,
            answer,
            completedAt: getUTCDate()
        }));

        // Bulk insert all responses
        await this.db.surveyResponses.bulkAdd(responseRecords);
    }

    async getSessionSurveyResponses(sessionId, surveyId = null) {
        if (!this.db) return [];

        try {
            await this.ensureOpen();
            let query = this.db.surveyResponses.where('sessionId').equals(sessionId);

            if (surveyId) {
                query = query.and(response => response.surveyId === surveyId);
            }

            return await query.toArray();
        } catch (error) {
            console.error('Error getting session survey responses:', error);
            return [];
        }
    }

    async deleteSessionSurveyResponses(sessionId, surveyId = null) {
        if (!this.db) return;

        try {
            await this.ensureOpen();
            if (surveyId) {
                await this.db.surveyResponses
                    .where(['sessionId', 'surveyId'])
                    .equals([sessionId, surveyId])
                    .delete();
            } else {
                await this.db.surveyResponses.where('sessionId').equals(sessionId).delete();
            }
        } catch (error) {
            console.error('Error deleting session survey responses:', error);
            throw error;
        }
    }

    async addSingleResponse(sessionId, surveyId, questionId, answer) {
        if (!this.db) return;

        await this.ensureOpen();

        const responseRecord = {
            id: generateUUID(),
            sessionId,
            surveyId,
            questionId,
            answer,
            completedAt: getUTCDate()
        };

        await this.db.surveyResponses.add(responseRecord);
        return responseRecord.id;
    }

    async updateResponse(responseId, updates) {
        if (!this.db) return;

        try {
            await this.ensureOpen();
            await this.db.surveyResponses.update(responseId, updates);
        } catch (error) {
            console.error('Error updating survey response:', error);
            throw error;
        }
    }

    async getResponsesByQuestion(sessionId, surveyId, questionId) {
        if (!this.db) return [];

        try {
            await this.ensureOpen();
            return await this.db.surveyResponses
                .where(['sessionId', 'surveyId', 'questionId'])
                .equals([sessionId, surveyId, questionId])
                .toArray();
        } catch (error) {
            console.error('Error getting responses by question:', error);
            return [];
        }
    }

    // Advanced operations
    async completeSurveySession(sessionId, surveyId, responses) {
        if (!this.db) return;

        // Only save responses - session status update handled by coordinator
        await this.saveAllResponses(sessionId, surveyId, responses);
    }

    // Statistics and analysis
    async getSurveyStatistics(sessionId, surveyId) {
        if (!this.db) return null;

        try {
            await this.ensureOpen();
            const responses = await this.getSessionSurveyResponses(sessionId, surveyId);

            if (responses.length === 0) {
                return { totalResponses: 0, completionTime: null };
            }

            const totalResponses = responses.length;

            // Calculate completion time if responses exist
            const firstResponse = responses.reduce((earliest, r) =>
                !earliest || new Date(r.completedAt) < new Date(earliest.completedAt) ? r : earliest
            );
            const lastResponse = responses.reduce((latest, r) =>
                !latest || new Date(r.completedAt) > new Date(latest.completedAt) ? r : latest
            );

            const completionTime = firstResponse && lastResponse ?
                new Date(lastResponse.completedAt) - new Date(firstResponse.completedAt) : null;

            return {
                totalResponses,
                completionTime,
                firstResponseAt: firstResponse?.completedAt,
                lastResponseAt: lastResponse?.completedAt
            };
        } catch (error) {
            console.error('Error getting survey statistics:', error);
            return null;
        }
    }

    // Check if survey has been completed for a session
    async isSurveyCompleted(sessionId, surveyId) {
        if (!this.db) return false;

        try {
            await this.ensureOpen();
            const responses = await this.getSessionSurveyResponses(sessionId, surveyId);
            return responses.length > 0;
        } catch (error) {
            console.error('Error checking survey completion:', error);
            return false;
        }
    }
}

// Create and export singleton instance
export const surveyResponseDB = new SurveyResponseDB();

