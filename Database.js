import { DatabaseError } from "./DatabaseError.js";

export class Database {
    #db;
    #state = 'closed';
    #upgradeStatus = 'upgraded';
    #transaction = {
        active: false,
        instance: null
    };
    #versionChanged = false;
    #name;
    #version;

    constructor(name) {
        if (typeof name !== 'string') throw new Error(`Failed to initialize DB: expected name to be of type string but received ${typeof name}`);
        this.#name = name;
    }

    #resetTransactionState() {
        this.#transaction.active = false;
        this.#transaction.instance = null;
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
                    // Add future event bus publish method here and pass the error
                }
            }
            this.close();
        }

        this.#state = 'opened';
    }

    async transaction(storeNames, mode, options, handlers) {
        if (this.#state !== 'opened') throw new Error(`Cannot perform a transaction: expected the state to be 'opened' but received ${this.#state}`);
        if (this.#upgradeStatus !== 'upgraded') throw new Error(`Cannot perform a transcation: expected the upgradeStatus to be 'upgraded' but received ${this.#upgradeStatus}`);
        if (this.#transaction.active === true) throw new Error('A transaction is in progress');
        if (typeof handlers !== 'object' && handlers != null) throw new Error('Must pass a valid handler object');

        try {
            await new Promise((resolve, reject) => {
                const transactionHandler = handlers.transactionHandler;
                if (typeof transactionHandler !== 'function') throw new Error(`Expected transactionHandler to be a function but received ${typeof transactionHandler}`);

                const transaction = this.#db.transaction(storeNames, mode, options);
                this.#transaction.active = true;
                this.#transaction.instance = transaction;
                const [ onAbortHandler, onErrorHandler, onCompleteHandler ] = [ handlers.onabort, handlers.onerror, handlers.oncomplete ];

                transaction.onabort = (event) => {
                    if (typeof onAbortHandler === 'function') {
                        onAbortHandler(event);
                    }
                    this.#resetTransactionState();
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
                    this.#resetTransactionState();
                    resolve();
                }

                transactionHandler(transaction);
            });
        } catch(err) {
            this.#resetTransactionState();
            throw new DatabaseError('An error occured while performing a transaction', err);
        }
    }

    abortCurrentTransaction() {
        if (this.#transaction.active !== true) throw new Error('There is no ongoing transaction');
        this.#transaction.instance.abort();
    }

    async upgrade(handlers) {
        if (this.#state === 'opening') throw new Error('Cannot upgrade a database while it\'s opening');
        if (this.#state !== 'opened') throw new Error('Tried upgrading a closed database');
        if (this.#upgradeStatus === 'upgrading') throw new Error('Cannot perform multiple upgrade operations simultaneously');
        if (this.#transaction.active === true) throw new Error('Cannot upgrade the database while a transaction is ongoing');
        this.#upgradeStatus = 'upgrading';
        while (this.#upgradeStatus !== 'upgraded') {
            try {
                this.close();
                await this.open(handlers);

                if (this.#versionChanged) {
                    this.close();
                    await this.open(handlers);
                }
            } catch (err) {
                if (this.#state !== 'closed') this.#db.close();
                this.#upgradeStatus = 'upgraded';
                throw new DatabaseError('An error occured while upgrading the database', err);
            }
        }
    }

    close() {
        if (this.#state === 'opening') throw new Error('Cannot close a database while it\'s opening');
        if (this.#state !== 'opened') throw new Error('Tried closing an already closed database');
        if (this.#transaction.active === true) throw new Error('Cannot close the database while a transaction is ongoing');
        this.#state = 'closed';
        this.#db.close();
    }
}