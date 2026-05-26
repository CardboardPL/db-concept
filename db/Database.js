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

    isClosed() {
        return this.#state === 'closed' && this.#upgradeStatus !== 'upgrading';
    }

    async open(handlers) {
        if (typeof handlers !== 'object' && handlers != null) throw new Error('Must pass a valid handler object');
        if (this.#state === 'opening') throw new Error('Cannot run multiple open attempts');
        if (this.#state === 'opened') throw new Error('Tried opening an already opened database');
        this.#state = 'opening';
        
        const DBOpenRequest = indexedDB.open(this.#name, this.#decideVersionToUse());
        try {
            this.#db = await new Promise((resolve, reject) => {
                DBOpenRequest.onupgradeneeded = (event) => {
                    this.#upgradeStatus = 'upgraded';
                    if (handlers && typeof handlers.onupgradeneeded === 'function') {
                        handlers.onupgradeneeded(event);
                    }
                };

                DBOpenRequest.onsuccess = (event) => {
                    const db = event.target.result;
                    this.#versionChanged = false;
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
                };
            });
        } catch (err) {
            this.#state = 'closed';
            if (err.name === 'VersionError') {
                this.#version = undefined;
                return this.open(handlers);
            } else {
                throw new DatabaseError('Failed to open database', err);
            }
        }

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
            this.close({
                reason: `Database "${this.#name}" version was changed`
            });
        }

        this.#state = 'opened';
    }

    transaction(storeNames, mode, handlers, data, options = {}) {
        if (this.#state !== 'opened') throw new Error(`Cannot perform a transaction: expected the state to be 'opened' but received ${this.#state}`);
        if (this.#upgradeStatus !== 'upgraded') throw new Error(`Cannot perform a transcation: expected the upgradeStatus to be 'upgraded' but received ${this.#upgradeStatus}`);

        // Validate transaction params
        if (!storeNames || (typeof storeNames === 'string' && storeNames.trim().length === 0) || (Array.isArray(storeNames) && storeNames.length === 0)) throw new Error(`Expected "storeNames" to be a non-empty string/array but received: "${storeNames}"`);
        if (!['readwrite', 'readonly'].includes(mode)) throw new Error(`Expected "mode" to be a string "readwrite" or "readonly" but received: "${mode}"`);
        if (!isPlainObject(handlers)) throw new Error(`Expected "handlers" to be a plain object but received: "${handlers}"`);
        if (!isPlainObject(options)) throw new Error(`Expected "options" to be a plain object but received: "${options}"`);

        // Create a controller to handle the abort
        const controller = new AbortController();

        // Transaction Logic Here
        const transactionId = crypto.randomUUID();
        const op = new Promise((resolve, reject) => {
            const handler = handlers.handler;
            if (typeof handler !== 'function') throw new Error(`Expected handler to be a function but received ${typeof handler}`);

            const transaction = this.#db.transaction(storeNames, mode, options);
            const [ onAbortHandler, onErrorHandler, onCompleteHandler ] = [ handlers.onabort, handlers.onerror, handlers.oncomplete ];
            
            // Start of Abort Logic
            let abortEvent;

            transaction.onabort = (transactionEvent) => {
                if (typeof onAbortHandler === 'function') {
                    onAbortHandler(transactionEvent);
                }
                this.#transactionRegistry.delete(transactionId);
                reject({
                    abortEvent,
                    transactionEvent
                });
            }

            controller.signal.addEventListener('abort', (e) => {
                abortEvent = e;
                transaction.abort();
            });
            // End of Abort Logic

            transaction.onerror = (event) => {
                const error = event.error;
                if (typeof onErrorHandler === 'function') {
                    onErrorHandler(error);
                }
                this.#transactionRegistry.delete(transactionId);
                reject(error);
            }

            transaction.oncomplete = (event) => {
                if (typeof onCompleteHandler === 'function') {
                    onCompleteHandler(event);
                }
                this.#transactionRegistry.delete(transactionId);
                resolve();
            }

            handler(transaction, data);
        });
        // Attach abort method
        op.abort = (reason) => { controller.abort(reason) };

        // Register transaction to the registry
        this.#transactionRegistry.set(transactionId, op);

        return op;
    }

    async upgrade(handlers, attemptCap) {
        if (this.#state === 'opening') throw new Error('Cannot upgrade a database while it\'s opening');
        if (this.#state !== 'opened') throw new Error('Tried upgrading a closed database');
        if (this.#upgradeStatus === 'upgrading') throw new Error('Cannot perform multiple upgrade operations simultaneously');
        if (Number.isNaN(attemptCap)) {
            attemptCap = null;
        }

        this.#upgradeStatus = 'upgrading';
        await navigator.locks.request(this.#databaseId, async () => {
            let attempts = 0;
            while (this.#upgradeStatus !== 'upgraded') {
                try {
                    if (typeof attemptCap === 'number' && attemptCap <= attempts) throw new Error(`Failed to upgrade within ${attemptCap} attempts`);
                    this.close({
                        reason: `Database "${this.#name}" is upgrading`
                    });
                    await this.open(handlers);
                    attempts++;
                } catch (err) {
                    if (this.#state !== 'closed') this.close({
                        reason: `Upgrade for Database "${this.#db}" encountered error`
                    });
                    this.#upgradeStatus = 'upgraded';
                    throw new DatabaseError('An error occured while upgrading the database', err);
                }
            }
        });
    }

    async delete(handlers, options) {
        if (this.#state === 'opening') throw new Error('Cannot delete the database while it\'s opening');
        if (this.#upgradeStatus === 'upgrading') throw new Error('Cannot delete the database while it\'s upgrading');
        if (this.#deleting === true) throw new Error('Cannot delete a database when it\'s already being deleted');
        this.#deleting = true;
        if (this.#state !== 'closed') this.close({
            reason: `Database "${this.#name}" is being deleted`
        });
        const DBDeleteRequest = indexedDB.deleteDatabase(this.#name, options);
        try {
            await new Promise((resolve, reject) => {
                DBDeleteRequest.onerror = (event) => {
                    const error = event.error;
                    if (typeof handlers.onerror === 'function') {
                        handlers.onerror(error);
                    }
                    reject(error);
                }

                DBDeleteRequest.onsuccess = (event) => {
                    if (typeof handlers.onsuccess === 'function') {
                        handlers.onsuccess(event);
                    }
                    resolve();
                }
            });
        } catch (err) {
            this.#deleting = false;
            throw new DatabaseError('An error occured while deleting the database', err);
        }
        this.#deleting = false;
    }

    close(config = {}) {
        if (this.#state === 'opening') throw new Error('Cannot close a database while it\'s opening');
        if (this.#state !== 'opened') throw new Error('Tried closing an already closed database');
        if (!isPlainObject(config)) throw new Error(`Expected close method config to be a plain object but received: ${config}`);

        // Set default values if messed with
        config.abortTransactions = config.abortTransactions == null ? config.abortTransactions : true;
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
}