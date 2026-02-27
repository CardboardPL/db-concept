import { Database } from './Database.js';

export class DatabaseProxy {
    #db;
    #state = 'closed';
    #allowedConnections;

    constructor(allowedConnections) {
        if (!Array.isArray(allowedConnections)) throw new Error('Failed to create a database proxy: allowedConnections must be an array');
        this.#allowedConnections = new Set(allowedConnections);
    }

    #resetState() {
        this.#db = null;
        this.#state = 'closed';
    }

    async open(name, handlers) {
        if (this.#state !== 'closed') throw new Error(`Rejected database proxy open attempt: expected the state to be 'closed' but received '${this.#state}'`);
        if (!this.#allowedConnections.has(name)) throw new Error('Rejected database proxy open attempt: illegal connection name');
        this.#state = 'opening';
        this.#db = new Database(name);
        try {
            await this.#db.open(handlers);
        } catch (err) {
            this.#resetState();
            throw new Error(err.message);
        }
        this.#state = 'opened';
    }

    async upgrade(handlers) {
        if (this.#state !== 'opened') throw new Error(`Rejected database proxy upgrade atttempt: expected the state to be 'open' but received '${this.#state}'`);
        this.#state = 'upgrading';
        try {
            await this.#db.upgrade(handlers);
        } catch (err) {
            this.#resetState();
            throw new Error(err.message);
        }
        this.#state = 'opened';
    }

    close() {
        if (this.#state !== 'opened') throw new Error(`Rejected database proxy close attempt: expected the state to be 'opened' but received '${this.#state}'`);
        this.#db.close();
        this.#resetState();
    }
}