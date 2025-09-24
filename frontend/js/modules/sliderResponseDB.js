import { generateUUID, getUTCDate } from './utilities.js';

// Slider Response Database Manager - handles slider response-related database operations only
export class SliderResponseDB {
    constructor() {
        this.db = null;
        this.initializeDatabase();
    }

    // Database initialization - responses only
    initializeDatabase() {
        if (typeof Dexie === 'undefined') {
            console.warn('Dexie not available, running without database persistence');
            this.db = null;
            return;
        }

        try {
            this.db = new Dexie('SliderResponsesDB');
            this.db.version(1).stores({
                pageResponses: 'id, sessionId, scenarioNumber, displayOrder, child1investment, completedAt'
            });
        } catch (error) {
            console.error('Failed to initialize SliderResponsesDB:', error);
            this.db = null;
            throw new Error('Database initialization failed');
        }
    }

    async ensureOpen() {
        if (this.db && !this.db.isOpen()) {
            await this.db.open();
        }
    }

    // Response CRUD operations
    async saveAllResponses(sessionId, responses) {
        if (!this.db) return;
        
        await this.ensureOpen();
        
        // Convert responses array to database records
        const responseRecords = responses.map(response => ({
            id: generateUUID(),
            sessionId,
            scenarioNumber: response.scenarioNumber,
            displayOrder: response.displayOrder,
            child1investment: response.child1investment,
            completedAt: response.completedAt
        }));

        // Bulk insert all responses
        await this.db.pageResponses.bulkAdd(responseRecords);
    }

    async getSessionSliderResponses(sessionId) {
        if (!this.db) return [];
        
        try {
            await this.ensureOpen();
            const responses = await this.db.pageResponses
                .where('sessionId')
                .equals(sessionId)
                .toArray();
            
            // Sort by displayOrder after retrieving
            return responses.sort((a, b) => a.displayOrder - b.displayOrder);
        } catch (error) {
            console.error('Error getting session responses:', error);
            return [];
        }
    }

    async deleteSessionResponses(sessionId) {
        if (!this.db) return;
        
        try {
            await this.ensureOpen();
            await this.db.pageResponses.where('sessionId').equals(sessionId).delete();
        } catch (error) {
            console.error('Error deleting session responses:', error);
            throw error;
        }
    }

    async addSingleResponse(sessionId, response) {
        if (!this.db) return;
        
        await this.ensureOpen();
        
        const responseRecord = {
            id: generateUUID(),
            sessionId,
            scenarioNumber: response.scenarioNumber,
            displayOrder: response.displayOrder,
            child1investment: response.child1investment,
            completedAt: response.completedAt || getUTCDate()
        };

        await this.db.pageResponses.add(responseRecord);
        return responseRecord.id;
    }

    async updateResponse(responseId, updates) {
        if (!this.db) return;
        
        try {
            await this.ensureOpen();
            await this.db.pageResponses.update(responseId, updates);
        } catch (error) {
            console.error('Error updating response:', error);
            throw error;
        }
    }

    async getResponsesByScenario(sessionId, scenarioNumber) {
        if (!this.db) return [];
        
        try {
            await this.ensureOpen();
            return await this.db.pageResponses
                .where(['sessionId', 'scenarioNumber'])
                .equals([sessionId, scenarioNumber])
                .toArray();
        } catch (error) {
            console.error('Error getting responses by scenario:', error);
            return [];
        }
    }

    // Advanced operations
    async completeSliderSession(sessionId, responses) {
        if (!this.db) return;
        
        // Only save responses - session status update handled by coordinator
        await this.saveAllResponses(sessionId, responses);
    }

    // Statistics and analysis
    async getResponseStatistics(sessionId) {
        if (!this.db) return null;
        
        try {
            await this.ensureOpen();
            const responses = await this.getSessionSliderResponses(sessionId);
            
            if (responses.length === 0) {
                return { totalResponses: 0, averageInvestment: 0, completionTime: null };
            }

            const totalResponses = responses.length;
            const totalInvestment = responses.reduce((sum, r) => sum + r.child1investment, 0);
            const averageInvestment = totalInvestment / totalResponses;
            
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
                averageInvestment: Math.round(averageInvestment * 100) / 100,
                completionTime,
                firstResponseAt: firstResponse?.completedAt,
                lastResponseAt: lastResponse?.completedAt
            };
        } catch (error) {
            console.error('Error getting response statistics:', error);
            return null;
        }
    }
}

// Create and export singleton instance
export const sliderResponseDB = new SliderResponseDB();

