import { generateUUID, getUTCDate } from './utilities.js';

// Session Database Manager - handles session-related database operations with Joined Table Inheritance pattern
export class SessionDB {
    constructor() {
        this.db = null;
        this.initializeDatabase();
    }

    // Database initialization with separate tables for base and session-type-specific data
    initializeDatabase() {
        if (typeof Dexie === 'undefined') {
            console.warn('Dexie not available, running without database persistence');
            this.db = null;
            return;
        }

        try {
            this.db = new Dexie('SessionsDB');

            // Version 4: New Joined Table Inheritance pattern
            this.db.version(4).stores({
                // Base session table with discriminator
                sessions: 'id, sessionType, enumeratorId, createdAt, uploadStatus, uploadedAt',

                // Child session details (separate table)
                childSessionDetails: 'id, familyId, childId, name, school, surveyStatus',

                // Parent session details (separate table)
                parentSessionDetails: 'id, familyId, school, groupType, preEarnings1, preEarnings2, surveyStatus, sliderStatus',
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

        await this.db.delete();
        this.db = null;
        this.initializeDatabase();
        await this.ensureOpen();
    }

    // ===== CHILD SESSION OPERATIONS =====

    async createChildSession(enumeratorId, familyId, childId, name, school) {
        if (!this.db) {
            throw new Error('Database not available');
        }

        await this.ensureOpen();

        const sessionId = generateUUID();

        try {
            await this.db.transaction('rw', this.db.sessions, this.db.childSessionDetails, async () => {
                // Insert base session record
                await this.db.sessions.add({
                    id: sessionId,
                    sessionType: 'child',
                    enumeratorId: enumeratorId,
                    createdAt: getUTCDate(),
                    uploadStatus: 'not_uploaded',
                    uploadedAt: null
                });

                // Insert child-specific details
                await this.db.childSessionDetails.add({
                    id: sessionId,
                    familyId: familyId,
                    childId: childId,
                    name: name,
                    school: school,
                    surveyStatus: 'not_started',
                    surveyCompletedAt: null
                });
            });
        } catch (error) {
            console.error('Error creating child session:', error);
            throw error;
        }

        return sessionId;
    }

    // ===== PARENT SESSION OPERATIONS =====

    async createParentSession(enumeratorId, familyId, child1Name, child2Name, school, groupType, preEarnings1, preEarnings2) {
        if (!this.db) {
            throw new Error('Database not available');
        }

        await this.ensureOpen();

        const sessionId = generateUUID();

        try {
            await this.db.transaction('rw', this.db.sessions, this.db.parentSessionDetails, async () => {
                // Insert base session record
                await this.db.sessions.add({
                    id: sessionId,
                    sessionType: 'parent',
                    enumeratorId: enumeratorId,
                    createdAt: getUTCDate(),
                    uploadStatus: 'not_uploaded',
                    uploadedAt: null
                });

                // Insert parent-specific details
                await this.db.parentSessionDetails.add({
                    id: sessionId,
                    familyId: familyId,
                    child1Name: child1Name,
                    child2Name: child2Name,
                    school: school,
                    groupType: groupType,
                    preEarnings1: preEarnings1,
                    preEarnings2: preEarnings2,
                    surveyStatus: 'not_started',
                    surveyCompletedAt: null,
                    exitSurveyStatus: 'not_started',
                    exitSurveyCompletedAt: null,
                    sliderStatus: 'not_started',
                    sliderStartedAt: null,
                    sliderCompletedAt: null
                });
            });
        } catch (error) {
            console.error('Error creating parent session:', error);
            throw error;
        }

        return sessionId;
    }

    // ===== QUERY OPERATIONS =====

    async loadSessions() {
        if (!this.db) return [];

        await this.ensureOpen();

        const baseSessions = await this.db.sessions.toArray();

        // Join with appropriate details table based on sessionType
        const fullSessions = await Promise.all(baseSessions.map(async (base) => {
            if (base.sessionType === 'child') {
                const details = await this.db.childSessionDetails.get(base.id);
                return { ...base, ...details, type: 'child' };
            } else {
                const details = await this.db.parentSessionDetails.get(base.id);
                return { ...base, ...details, type: 'parent' };
            }
        }));

        return fullSessions;
    }

    async getSession(sessionId) {
        if (!this.db) return null;

        await this.ensureOpen();

        const base = await this.db.sessions.get(sessionId);
        if (!base) return null;

        if (base.sessionType === 'child') {
            const details = await this.db.childSessionDetails.get(sessionId);
            return { ...base, ...details, type: 'child' };
        } else {
            const details = await this.db.parentSessionDetails.get(sessionId);
            return { ...base, ...details, type: 'parent' };
        }
    }

    async deleteSession(sessionId) {
        if (!this.db) {
            throw new Error('Database not available');
        }

        await this.ensureOpen();

        const session = await this.db.sessions.get(sessionId);
        if (!session) {
            throw new Error('Session not found');
        }

        await this.db.transaction('rw', this.db.sessions, this.db.childSessionDetails, this.db.parentSessionDetails, async () => {
            // Delete from appropriate details table
            if (session.sessionType === 'child') {
                await this.db.childSessionDetails.delete(sessionId);
            } else {
                await this.db.parentSessionDetails.delete(sessionId);
            }

            // Delete from base sessions table
            await this.db.sessions.delete(sessionId);
        });
    }

    // ===== STATUS UPDATE OPERATIONS =====

    async markChildSurveyStarted(sessionId) {
        if (!this.db) throw new Error('Database not available');
        await this.ensureOpen();

        await this.db.childSessionDetails.update(sessionId, {
            surveyStatus: 'in_progress',
            surveyStartedAt: getUTCDate()
        });
    }

    async markChildSurveyCompleted(sessionId) {
        if (!this.db) throw new Error('Database not available');
        await this.ensureOpen();

        await this.db.childSessionDetails.update(sessionId, {
            surveyStatus: 'completed',
            surveyCompletedAt: getUTCDate()
        });
    }

    async markParentSurveyStarted(sessionId) {
        if (!this.db) throw new Error('Database not available');
        await this.ensureOpen();

        await this.db.parentSessionDetails.update(sessionId, {
            surveyStatus: 'in_progress',
            surveyStartedAt: getUTCDate()
        });
    }

    async markParentSurveyCompleted(sessionId) {
        if (!this.db) throw new Error('Database not available');
        await this.ensureOpen();

        await this.db.parentSessionDetails.update(sessionId, {
            surveyStatus: 'completed',
            surveyCompletedAt: getUTCDate()
        });
    }

    async markExitSurveyStarted(sessionId) {
        if (!this.db) throw new Error('Database not available');
        await this.ensureOpen();

        await this.db.parentSessionDetails.update(sessionId, {
            exitSurveyStatus: 'in_progress',
            exitSurveyStartedAt: getUTCDate()
        });
    }

    async markExitSurveyCompleted(sessionId) {
        if (!this.db) throw new Error('Database not available');
        await this.ensureOpen();

        await this.db.parentSessionDetails.update(sessionId, {
            exitSurveyStatus: 'completed',
            exitSurveyCompletedAt: getUTCDate()
        });
    }

    async markSliderStarted(sessionId) {
        if (!this.db) throw new Error('Database not available');
        await this.ensureOpen();

        await this.db.parentSessionDetails.update(sessionId, {
            sliderStatus: 'in_progress',
            sliderStartedAt: getUTCDate()
        });
    }

    async markSliderCompleted(sessionId) {
        if (!this.db) throw new Error('Database not available');
        await this.ensureOpen();

        await this.db.parentSessionDetails.update(sessionId, {
            sliderStatus: 'completed',
            sliderCompletedAt: getUTCDate()
        });
    }

    // ===== UPLOAD OPERATIONS =====

    async updateSessionStatus(sessionId, updates) {
        if (!this.db) throw new Error('Database not available');
        await this.ensureOpen();

        await this.db.sessions.update(sessionId, updates);
    }

    async markSessionUploaded(sessionId) {
        if (!this.db) throw new Error('Database not available');
        await this.ensureOpen();

        await this.db.sessions.update(sessionId, {
            uploadStatus: 'uploaded',
            uploadedAt: getUTCDate()
        });
    }

    async getCompletedSessions() {
        if (!this.db) return [];

        await this.ensureOpen();

        const allSessions = await this.loadSessions();

        // Filter for completed sessions based on type
        return allSessions.filter(session => {
            if (session.sessionType === 'child') {
                return session.surveyStatus === 'completed';
            } else {
                // Parent session
                const surveyDone = session.surveyStatus === 'completed';
                const sliderDone = session.sliderStatus === 'completed';
                const exitDone = session.exitSurveyStatus === 'completed';

                if (session.groupType === 'treatment') {
                    return surveyDone && sliderDone && exitDone;
                } else {
                    return surveyDone;
                }
            }
        });
    }

    async getUploadedSessions() {
        if (!this.db) return [];

        await this.ensureOpen();

        const uploadedBases = await this.db.sessions
            .where('uploadStatus').equals('uploaded')
            .toArray();

        const fullSessions = await Promise.all(uploadedBases.map(async (base) => {
            if (base.sessionType === 'child') {
                const details = await this.db.childSessionDetails.get(base.id);
                return { ...base, ...details, type: 'child' };
            } else {
                const details = await this.db.parentSessionDetails.get(base.id);
                return { ...base, ...details, type: 'parent' };
            }
        }));

        return fullSessions;
    }

    async getCurrentSessions() {
        if (!this.db) return [];

        await this.ensureOpen();

        const currentBases = await this.db.sessions
            .where('uploadStatus').notEqual('uploaded')
            .toArray();

        const fullSessions = await Promise.all(currentBases.map(async (base) => {
            if (base.sessionType === 'child') {
                const details = await this.db.childSessionDetails.get(base.id);
                return { ...base, ...details, type: 'child' };
            } else {
                const details = await this.db.parentSessionDetails.get(base.id);
                return { ...base, ...details, type: 'parent' };
            }
        }));

        return fullSessions;
    }
}

export const sessionDB = new SessionDB();
