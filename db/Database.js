import { DatabaseError } from "./DatabaseError.js";
import { isPlainObject } from "../utils/isPlainObject.js";

export class Database {
    #db;
    #state = 'closed';
    #upgradeStatus = 'upgraded';
    #deleting = false;
    #versionChanged = false;
    #transactionRegistry = new Map();
    #databaseId;
    #name;
    #version;

    constructor(name, databaseId) {
        if (typeof name !== 'string' || !name.trim()) throw new Error(`Failed to initialize DB: expected name to be of type string but received ${typeof name}`);
        if (databaseId == null) {
            this.#databaseId = name;
        } else if (typeof databaseId !== 'string' || !databaseId.trim()) {
            throw new Error(`Failed to initialize DB: expected name to be of a non-empty string but received: ${name}`);
        } else {
            this.#databaseId = databaseId;
        }
        this.#name = name;
    }

    #decideVersionToUse() {
        let versionToUse;
        if (this.#versionChanged) {
            versionToUse = undefined;
        } else if (this.#version && this.#upgradeStatus === 'upgrading') {
            versionToUse = this.#version + 1;
        } else {
            versionToUse = this.#version;
        }
        return versionToUse;
    }

    async #openDatabase(handlers, options = {}) {
        if (typeof handlers !== 'object' && handlers != null) throw new Error('Must pass a valid handler object');
        if (this.#deleting === true) throw new Error('Tried opening a database that is being deleted');
        
        this.#state = 'opening';
        const DBOpenRequest = indexedDB.open(this.#name, this.#decideVersionToUse());
        const upgradeAbortSignal = options.upgradeAbortSignal;
        
        try {
            this.#db = await new Promise((resolve, reject) => {
                DBOpenRequest.onupgradeneeded = (event) => {
                    const tx = event.target.transaction;
                    if (upgradeAbortSignal && upgradeAbortSignal.aborted) {
                        tx.abort();
                        return;
                    }

                    if (upgradeAbortSignal) {
                        upgradeAbortSignal.addEventListener('abort', () => {
                            tx.abort();
                        });
                    }

                    if (handlers && typeof handlers.onupgradeneeded === 'function') {
                        handlers.onupgradeneeded(event);
                    }

                    this.#upgradeStatus = 'upgraded';
                };

                DBOpenRequest.onsuccess = (event) => {
                    const db = event.target.result;
                    this.#versionChanged = false;
                    this.#version = db.version;

                    this.#db.onversionchange = (event) => {
                        this.#versionChanged = true;
                        if (this.#upgradeStatus === 'upgrading') return;
                        if (handlers && typeof handlers.onversionchange === 'function') {
                            try {
                                handlers.onversionchange(event);
                            } catch(err) {
                                console.error(err);
                                if (typeof handlers.onversionchangeerror === 'function') {
                                    handlers.onversionchangeerror(err);
                                }
                            }
                        }
                        this.#closeDatabase({
                            reason: `Database "${this.#name}" version was changed`
                        });
                    }

                    this.#state = 'opened';
                    resolve(db);
                };

                DBOpenRequest.onblocked = (event) => {
                    if (handlers && typeof handlers.onblocked === 'function') {
                        handlers.onblocked(event);
                    }
                };
    
                DBOpenRequest.onerror = (event) => {
                    const error = event.target.error;
                    if (error.name !== 'VersionError' && handlers && typeof handlers.onerror === 'function') {
                        handlers.onerror(error);
                    }
                    reject(error);
                };
            });
        } catch (err) {
            if (err.name === 'VersionError') {
                this.#version = undefined;
                return this.#openDatabase(handlers, options);
            } else {
                this.#state = 'closed';
                throw new DatabaseError('Failed to open database', err);
            }
        }
    }

    #closeDatabase(config = {}) {
        if (this.#state === 'opening') throw new Error('Cannot close a database while it\'s opening');
        if (this.#state !== 'opened') throw new Error('Tried closing an already closed database');
        if (!isPlainObject(config)) throw new Error(`Expected close method config to be a plain object but received: ${config}`);

        // Set default values if messed with
        config.abortTransactions = config.abortTransactions == null ? true : config.abortTransactions;
        config.reason = config.reason ? config.reason : `Database "${this.#name}" was closed`;

        this.#state = 'closed';

        if (config.abortTransactions) {
            for (const [id, tx] of this.#transactionRegistry) {
                tx.abort(config.reason);
                this.#transactionRegistry.delete(id);
            }
        }

        this.#db.close();
    }

    isClosed() {
        return this.#state === 'closed' && this.#upgradeStatus !== 'upgrading';
    }

    async open(handlers, options) {
        if (this.#state === 'opening') throw new Error('Cannot run multiple open attempts');
        if (this.#state === 'opened') throw new Error('Tried opening an already opened database');
        if (this.#upgradeStatus === 'upgrading') throw new Error('Cannot open the database while it\'s upgrading the database');
        await this.#openDatabase(handlers, options);
    }

    transaction(storeNames, mode, handler, data, options = {}) {
        // Create a controller to handle the abort
        const controller = new AbortController();

        // Transaction Logic Here
        const transactionId = crypto.randomUUID();
        const op = new Promise((resolve, reject) => {
            if (this.#state !== 'opened') throw new Error(`Cannot perform a transaction: expected the state to be 'opened' but received ${this.#state}`);
            if (this.#upgradeStatus !== 'upgraded') throw new Error(`Cannot perform a transcation: expected the upgradeStatus to be 'upgraded' but received ${this.#upgradeStatus}`);

            // Validate transaction params
            if (!storeNames || (typeof storeNames === 'string' && storeNames.trim().length === 0) || (Array.isArray(storeNames) && storeNames.length === 0)) throw new Error(`Expected "storeNames" to be a non-empty string/array but received: "${storeNames}"`);
            if (!['readwrite', 'readonly'].includes(mode)) throw new Error(`Expected "mode" to be a string "readwrite" or "readonly" but received: "${mode}"`);
            if (typeof handler !== 'function') throw new Error(`Expected handler to be a function but received ${typeof handler}`);
            if (!isPlainObject(options)) throw new Error(`Expected "options" to be a plain object but received: "${options}"`);

            const transaction = this.#db.transaction(storeNames, mode, options);
            let handlerResult;
            
            // Start of Abort Logic
            let abortEvent;

            transaction.onabort = (transactionEvent) => {
                this.#transactionRegistry.delete(transactionId);
                reject({
                    type: 'abort',
                    abortEvent,
                    transactionEvent
                });
            }

            const abortHandler = (e) => {
                abortEvent = e;
                transaction.abort();
                controller.signal.removeEventListener('abort', abortHandler);
            }

            controller.signal.addEventListener('abort', abortHandler);
            // End of Abort Logic

            transaction.onerror = (event) => {
                controller.signal.removeEventListener('abort', abortHandler);
                const error = event.target.error;
                this.#transactionRegistry.delete(transactionId);
                reject({
                    type: 'error',
                    error
                });
            }

            transaction.oncomplete = (event) => {
                controller.signal.removeEventListener('abort', abortHandler);
                this.#transactionRegistry.delete(transactionId);
                resolve({
                    type: 'complete',
                    result: handlerResult,
                    event
                });
            }

            handlerResult = handler(transaction, data);
        });
        // Attach abort method
        op.abort = (reason) => { 
            controller.abort(reason);
            return op;
         };

        // Register transaction to the registry
        this.#transactionRegistry.set(transactionId, op);

        return op;
    }

    upgrade(handlers, attemptCap) {
        const controller = new AbortController();
        const lock = new Promise(async (resolve, reject) => {
            // Validate State
            if (this.#state === 'opening') throw new Error('Cannot upgrade a database while it\'s opening');
            if (this.#state !== 'opened') throw new Error('Tried upgrading a closed database');
            if (this.#upgradeStatus === 'upgrading') throw new Error('Cannot perform multiple upgrade operations simultaneously');
            if (Number.isNaN(attemptCap)) {
                attemptCap = null;
            }

            // Set status to "upgrading" to start the process
            this.#upgradeStatus = 'upgrading';
            
            // Upgrade the database
            try {
                await navigator.locks.request(this.#databaseId, { signal: controller.signal }, async () => {
                    let attempts = 0;
                    while (this.#upgradeStatus !== 'upgraded') {
                        try {
                            if (typeof attemptCap === 'number' && attemptCap <= attempts) throw new Error(`Failed to upgrade within ${attemptCap} attempts`);
                            this.#closeDatabase({
                                reason: `Database "${this.#name}" is upgrading`
                            });
                            await this.#openDatabase(handlers, { upgradeAbortSignal: controller.signal });
                            attempts++;
                        } catch (err) {
                            if (this.#state !== 'closed') this.#closeDatabase({
                                reason: `Upgrade for Database "${this.#name}" encountered error`
                            });
                            this.#upgradeStatus = 'upgraded';
                            throw new DatabaseError('An error occured while upgrading the database', err);
                        }
                    }

                    // Finish the operation
                    resolve();
                });
            } catch(err) {
                this.#upgradeStatus = 'upgraded';
                reject(err);
            }
        });
        
        // Attach abort handler
        lock.abort = () => {
            controller.abort('Upgrade was aborted');
        };

        return lock;
    }

    delete(options) {
        return new Promise((resolve, reject) => {
            // Validate State
            if (this.#state === 'opening') throw new Error('Cannot delete the database while it\'s opening');
            if (this.#upgradeStatus === 'upgrading') throw new Error('Cannot delete the database while it\'s upgrading');
            if (this.#deleting === true) throw new Error('Cannot delete a database when it\'s already being deleted');

            // Set the stage
            this.#deleting = true;
            if (this.#state !== 'closed') this.#closeDatabase({
                reason: `Database "${this.#name}" is being deleted`
            });

            // Perform the operation
            const DBDeleteRequest = indexedDB.deleteDatabase(this.#name, options);
            DBDeleteRequest.onerror = (event) => {
                this.#deleting = false;
                const error = event.target.error;
                reject({
                    type: 'error',
                    error,
                    timeStamp: event.timeStamp
                });
            }

            DBDeleteRequest.onsuccess = (event) => {
                this.#deleting = false;
                resolve({
                    type: 'success',
                    timeStamp: event.timeStamp
                });
            }
        });
    }

    close(config = {}) {
        if (this.#upgradeStatus === 'upgrading') throw new Error('Cannot close the database while it\'s upgrading');
        this.#closeDatabase(config);
    }
}