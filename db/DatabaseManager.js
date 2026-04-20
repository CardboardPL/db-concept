import { Database } from './Database.js';

export class DatabaseManager {
    #databases;

    constructor() {
        this.#databases = new Map();
    }

    addDatabase(name) {
        if (typeof name !== 'string' || !name.trim()) throw new Error('Failed to add database: name must be a non-empty string');
        const dbName = name.toUpperCase();
        if (!this.#databases.has(dbName)) {
            this.#databases.set(dbName, new Database(dbName));
        }
    }

    removeDatabase(name) {

    }

    getDatabase(name) {
        
    }
}