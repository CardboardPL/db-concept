import { DatabaseError } from "./DatabaseError.js";
import { isPlainObject } from "../utils/isPlainObject.js";
import { Queue } from "../data-structures/Queue.js";

export class Database {
    #db;
    #state = 'closed';
    #upgradeStatus = 'upgraded';
    #transactionRegistry = {
        transactions: new Map(),
        configs: new Map()
    };
    #deleting = false;
    #versionChanged = false;
    #name;
    #version;

    constructor(name, options) {
        if (typeof name !== 'string') throw new Error(`Failed to initialize DB: expected name to be of type string but received ${typeof name}`);
        this.#name = name;

        if (options == null) return;
        if (!isPlainObject(options)) throw new Error(`Failed to initialize DB: expected options to be a plain object but received "${typeof options}`);

        const { transactionConfigs } = options;
        this.#setupTransactionConfigs(transactionConfigs);
    }

    #setupTransactionConfigs(configs) {
        if (configs == null) return;
        if (!Array.isArray(configs)) throw new Error(`Expected transactionConfigs to be an array but received "${typeof configs}"`);

        for (const config of configs) {
            if (!isPlainObject(config)) throw new Error(`Expected transactionConfig to be a plain object but received "${typeof config}"`);
            
            let type = typeof config.type === 'string' ? config.type.trim() : null;
            if (!type) throw new Error(`Expected transaction type to be a non-empty string`);
            if (!['readonly', 'readwrite'].includes(config.mode)) throw new Error(`Expected transaction mode to either be "readonly" or "readwrite" but received "${config.mode}"`);

            const storeNames = config.reliesOn;
            if (!Array.isArray(storeNames)) throw new Error(`Expected reliesOn to be an array but received ${typeof storeNames}`);

            if (!isPlainObject(config.handlers)) throw new Error(`Transaction handlers must be a plain object (e.g., { name: func }) but received: ${typeof config.handlers}`);

            this.#transactionRegistry.configs.set(type, {
                mode: config.mode
            });

            this.#processTransactionConfigStoreNames(type, storeNames);
            this.#processTransactionConfigHandlers(type, config.handlers);
        }
    }

    #processTransactionConfigStoreNames(type, storeNames) {
        for (let name of storeNames) {
            if (typeof name !== 'string') throw new Error(`Transaction "${type}" store name "${name}" must be a string`);
            name = name.trim();
            if (!name) throw new Error(`Transaction "${type}" store name "${name}" must be a non-empty string`);

            const typeEntry = this.#transactionRegistry.configs.get(type);
            if (!typeEntry.reliesOn) {
                typeEntry.reliesOn = [];
            }
            typeEntry.reliesOn.push(name);
        }
    }

    #processTransactionConfigHandlers(type, handlers) {
        const necessaryHandlerNames = ['handler', 'onabort', 'onerror', 'oncomplete'];

        for (const name of necessaryHandlerNames) {
            const handler = handlers[name];
            if (name !== 'handler' && handler == null) continue;
            if (typeof handler !== 'function') throw new Error(`Transaction "${type}" handler "${name}" must be a function, but received "${typeof handler}"`);

            // Handler Registration
            const typeObj = this.#transactionRegistry.configs.get(type);
            if (!isPlainObject(typeObj.handlers)) {
                typeObj.handlers = {};
            }
            typeObj.handlers[name] = handler;
        }
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
            this.close();
        }

        this.#state = 'opened';
    }

    async transaction(type, data) {
        if (this.#state !== 'opened') throw new Error(`Cannot perform a transaction: expected the state to be 'opened' but received ${this.#state}`);
        if (this.#upgradeStatus !== 'upgraded') throw new Error(`Cannot perform a transcation: expected the upgradeStatus to be 'upgraded' but received ${this.#upgradeStatus}`);
        const config = this.#transactionRegistry.configs.get(type);
        if (!config || !isPlainObject(config)) throw new Error('Must pass a valid config object');

        const { storeNames, mode, handlers, options } = config;
        try {
            await new Promise((resolve, reject) => {
                const handler = handlers.handler;
                if (typeof handler !== 'function') throw new Error(`Expected handler to be a function but received ${typeof handler}`);

                const transaction = this.#db.transaction(storeNames, mode, options);
                const [ onAbortHandler, onErrorHandler, onCompleteHandler ] = [ handlers.onabort, handlers.onerror, handlers.oncomplete ];

                transaction.onabort = (event) => {
                    if (typeof onAbortHandler === 'function') {
                        onAbortHandler(event);
                    }
                    resolve();
                }

                transaction.onerror = (event) => {
                    const error = event.error;
                    if (typeof onErrorHandler === 'function') {
                        onErrorHandler(error);
                    }
                    reject(error);
                }

                transaction.oncomplete = (event) => {
                    if (typeof onCompleteHandler === 'function') {
                        onCompleteHandler(event);
                    }
                    resolve();
                }

                handler(transaction, data);
            });
        } catch(err) {
            throw new DatabaseError('An error occured while performing a transaction', err);
        }
    }

    async upgrade(handlers, attemptCap) {
        if (this.#state === 'opening') throw new Error('Cannot upgrade a database while it\'s opening');
        if (this.#state !== 'opened') throw new Error('Tried upgrading a closed database');
        if (this.#upgradeStatus === 'upgrading') throw new Error('Cannot perform multiple upgrade operations simultaneously');
        if (Number.isNaN(attemptCap)) {
            attemptCap = null;
        }

        this.#upgradeStatus = 'upgrading';
        let attempts = 0;
        while (this.#upgradeStatus !== 'upgraded') {
            try {
                if (typeof attemptCap === 'number' && attemptCap <= attempts) throw new Error(`Failed to upgrade within ${attemptCap} attempts`);
                this.close();
                await this.open(handlers);
                attempts++;
            } catch (err) {
                if (this.#state !== 'closed') this.close();
                this.#upgradeStatus = 'upgraded';
                throw new DatabaseError('An error occured while upgrading the database', err);
            }
        }
    }

    async delete(handlers, options) {
        if (this.#state === 'opening') throw new Error('Cannot delete the database while it\'s opening');
        if (this.#upgradeStatus === 'upgrading') throw new Error('Cannot delete the database while it\'s upgrading');
        if (this.#deleting === true) throw new Error('Cannot delete a database when it\'s already being deleted');
        this.#deleting = true
        if (this.#state !== 'closed') this.close();
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

    close() {
        if (this.#state === 'opening') throw new Error('Cannot close a database while it\'s opening');
        if (this.#state !== 'opened') throw new Error('Tried closing an already closed database');
        this.#state = 'closed';
        this.#db.close();
    }
}