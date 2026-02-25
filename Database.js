import { DatabaseError } from "./DatabaseError.js";

class Database {
    #db;
    #isOpen = false;
    #name;
    #version;

    constructor(name, version) {
        if (typeof name !== 'string') throw new Error(`Failed to initialize DB: expected name to be of type string but received ${typeof name}`);
        if (typeof version !== 'number' && version != null) throw new Error(`Failed to initialize DB: expected version to be of type number but received ${typeof version}`);
        if (version <= 0) throw new Error('Failed to initialize DB: version number must be a positive integer');
        this.#name = name;
        this.#version = version;
    }

    async open(handlers) {
        if (typeof handlers !== 'object' && handlers != null) throw new Error('Must pass a valid handler object');
        if (this.#isOpen) throw new Error('Tried opening an already opened database');
        
        const DBOpenRequest = indexedDB.open(this.#name, this.#version);
        try {
            this.#db = await new Promise((resolve, reject) => {
                DBOpenRequest.onupgradeneeded = (event) => {
                    if (handlers && typeof handlers.onupgradeneeded === 'function') {
                        handlers.onupgradeneeded(event);
                    }
                };

                DBOpenRequest.onsuccess = (event) => {                    
                    resolve(event.target.result);
                };

                DBOpenRequest.onblocked = (event) => {
                    if (handlers && typeof handlers.onblocked === 'function') {
                        handlers.onblocked(event);
                    }
                };
    
                DBOpenRequest.onerror = (event) => {
                    const error = event.error;
                    
                    if (handlers && typeof handlers.onerror === 'function') {
                        handlers.onerror(error);
                    }
                    reject(error);
                }
            });
        } catch (err) {
            throw new DatabaseError('Failed to open database', err);
        }

        this.#db.onversionchange = (event) => {
            if (handlers && typeof handlers.onversionchange === 'function') {
                handlers.onversionchange(event);
            }
            this.close();
        }

        this.#isOpen = true;
    }

    close() {
        if (!this.#isOpen) throw new Error('Tried closing an already closed database');
        this.#isOpen = false;
        this.#db.close();
    }
}

const db = new Database('db-1', 1);
db.open();
console.log(db);