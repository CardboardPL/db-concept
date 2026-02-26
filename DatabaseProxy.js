import { Database } from './Database.js';

export class DatabaseProxy {
    #db;
    #state = 'closed';
    #allowedConnections;

    constructor(allowedConnections) {
        if (!Array.isArray(allowedConnections)) throw new Error('Failed to create a database proxy: allowedConnections must be an array');
        this.#allowedConnections = new Set(allowedConnections);
    }

    async open(name, handlers) {
        if (this.#state === 'opening') throw new Error('Rejected database proxy open atttempt: cannot run multiple open attempts simultaneously');
        if (this.#state === 'opened') throw new Error('Rejected database proxy open atttempt: cannot open an already opened database');
        if (!this.#allowedConnections.has(name)) throw new Error('Rejected database proxy open attempt: illegal connection name');
        this.#state = 'opening';
        
        const db = new Database(name);
        this.#db = await db.open(handlers);

        this.#state = 'opened';
    }

    async upgrade(handlers) {
        if (this.#state === 'closed') throw new Error('Rejected database proxy upgrade atttempt: cannot perform an upgrade on a closed database');
        if (this.#state === 'opening') throw new Error('Rejected database proxy upgrade atttempt: cannot perform an upgrade while the database is opening');
        if (this.#state === 'upgrading') throw new Error('Rejected database proxy upgrade attempt: cannot run multiple upgrade attempts simultaneously');
        this.#state = 'upgrading';
        await this.#db.upgrade(handlers);
        this.#state = 'opened';
    }

    close() {
        if (this.#state === 'closed') throw new Error('Rejected database proxy close atttempt: cannot close an already closed database');
        if (this.#state === 'opening') throw new Error('Rejected database proxy upgrade atttempt: cannot close an opening database');
        if (this.#state === 'upgrading') throw new Error('Rejected database proxy upgrade attempt: cannot close a database while it\'s upgrading');
        this.#db.close();
        this.#db = null;
        this.#state = 'closed';
    }
}