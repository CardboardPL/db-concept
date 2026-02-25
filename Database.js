import { DatabaseError } from "./DatabaseError.js";

class Database {
    #db;
    #isOpen = false;
    #name;
    #version;

    constructor(name) {
        if (typeof name !== 'string') throw new Error(`Failed to initialize DB: expected name to be of type string but received ${typeof name}`);
        this.#name = name;
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
                    const db = event.target.result;   
                    this.#version = db.version;         
                    resolve(db);
                };

                DBOpenRequest.onblocked = (event) => {
                    if (handlers && typeof handlers.onblocked === 'function') {
                        handlers.onblocked(event);
                    }
                };
    
                DBOpenRequest.onerror = (event) => {
                    const error = event.error;
                    if (error.name !== 'VersionError' && handlers && typeof handlers.onerror === 'function') {
                        handlers.onerror(error);
                    }
                    reject(error);
                }
            });
        } catch (err) {
            if (err.name === 'VersionError') {
                this.#version = undefined;
                return this.open(handlers);
            } else {
                throw new DatabaseError('Failed to open database', err);
            }
        }

        this.#db.onversionchange = (event) => {
            this.#version = event.newVersion;
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