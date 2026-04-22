import { Database } from './Database.js';

export class DatabaseManager {
    #buckets;

    constructor(bucketsArr) {
        this.#buckets = new Map();

        if (Array.isArray(bucketsArr)) {
            let count = 0;
            for (const bucket of bucketsArr) {
                if (typeof bucket !== 'string') continue;
                this.#buckets.set(bucket.toUpperCase(), new Map());
                count++;
            }
            if (!count) throw new Error('Failed to initialize DatabaseManager: no buckets were created');
        } else throw new Error('Failed to initialize DatabaseManager: bucketsArr must be an array');
    }

    addDatabase(bucket, name) {
        if (typeof name !== 'string' || !name.trim()) throw new Error('Failed to add database: name must be a non-empty string');
        if (typeof bucket !== 'string' || !bucket.trim()) throw new Error('Failed to add database: bucket must be a non-empty string');
        
        const dbName = name.toUpperCase();
        const databases = this.#buckets.get(bucket.toUpperCase());
        if (!databases) throw new Error('Failed to add database: bucket does not exist');
        if (!databases.has(dbName)) {
            databases.set(dbName, new Database(dbName));
        }
    }

    removeDatabase(bucket, name) {
        if (typeof name !== 'string' || !name.trim()) throw new Error('Failed to remove database: name must be a non-empty string');
        if (typeof bucket !== 'string' || !bucket.trim()) throw new Error('Failed to remove database: bucket must be a non-empty string');
        const dbName = name.toUpperCase();
        const databases = this.#buckets.get(bucket.toUpperCase());
        if (!databases) throw new Error('Failed to remove database: bucket does not exist');

        const db = databases.get(dbName);
        if (db && !db.isClosed()) {
            db.close();
        }
        databases.delete(dbName);
    }

    getDatabase(bucket, name) {
        if (typeof name !== 'string' || !name.trim()) throw new Error('Failed to get database: name must be a non-empty string');
        if (typeof bucket !== 'string' || !bucket.trim()) throw new Error('Failed to get database: bucket must be a non-empty string');
        const databases = this.#buckets.get(bucket.toUpperCase());
        if (!databases) throw new Error('Failed to get database: bucket does not exist');
        return databases.get(name.toUpperCase());
    }
}