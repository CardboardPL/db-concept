import { DatabaseError } from "./DatabaseError.js";
import { isPlainObject } from "../utils/isPlainObject.js";
import { Queue } from "../data-structures/Queue.js";

export class Database {
    #db;
    #eventTarget = new EventTarget();
    #state = 'closed';
    #upgradeStatus = 'upgraded';
    #transactionRegistry = {
        transactions: new Map(),
        configs: new Map()
    };
    #queueRegistry = {
        storeToQueueMap: new Map(),
        queueMetadata: new Map()
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

        const { storeConfig, transactionConfigs } = options;
        this.#setupStoreConfig(storeConfig);
        this.#setupTransactionConfigs(transactionConfigs);

        this.#eventTarget.addEventListener('taskAdded', this.#handleTaskAdded);
        this.#eventTarget.addEventListener('taskComplete', this.#handleTaskComplete)
    }

    #handleTaskAdded(e) {
        const queues = e.detail;
        for (const queue of queues) {
            const queueMetadata = this.#queueRegistry.queueMetadata.get(queue);
            if (queueMetadata.isRunning) continue;
            const handler = queue.dequeue();
            handler();
            queueMetadata.isRunning = true;
        }
    }

    #handleTaskComplete(e) {
        const { queue, transactionId } = e.detail;

        // Queue Next Item if there are more tasks
        const hasNextItem = queue.peek();
        if (hasNextItem) {
            const handler = queue.dequeue();
            handler();
        // Reset Queue State if the queue is empty
        } else {
            this.#queueRegistry.queueMetadata.get(queue).isRunning = false;
        }

        // Remove transaction from the registry
        this.#transactionRegistry.transactions.delete(transactionId);
    }

    #setupStoreConfig(config) {
        if (config == null) return;
        if (!isPlainObject(config)) throw new Error(`Expected storeConfig to be a plain object but received: ${typeof config}`);
        
        this.#processStoreGroups(config.storeGroups);
    }

    // TODO: Add a way to undo changes (check everything first before updating the registry)
    #processStoreGroups(groups, stopOnSameQueues = false) {
        if (groups == null) return;
        if (!Array.isArray(groups)) throw new Error(`Expected storeConfig.groups to be an array but received: ${typeof groups}`);

        const seen = new Set();
        for (const group of groups) {
            if (!Array.isArray(group)) throw new Error(`Expected a group of storeConfig.groups to be an array but received: ${typeof group}`);
            if (group.length === 0) continue;

            // Find all necessary queues
            const storeToQueueMap = this.#queueRegistry.storeToQueueMap;
            const formattedStoreNames = [];
            const necessaryQueues = new Set();
            for (let storeName of group) {
                if (typeof storeName !== 'string') throw new Error(`Expected storeName to be a string but received: ${typeof storeName}`);
                storeName = storeName.trim();
                if (!storeName) throw new Error('Expected storeName to be a non-empty string');
                if (seen.has(storeName)) throw new Error('Overlapping storeNames are not allowed between groups');

                const registeredQueue = storeToQueueMap.get(storeName);
                if (registeredQueue) {
                    necessaryQueues.add(registeredQueue);
                }
                formattedStoreNames.push(storeName);
            }

            const necessaryQueuesAmount = necessaryQueues.size;
            if (stopOnSameQueues && necessaryQueuesAmount) continue;

            let newQueue;
            if (necessaryQueuesAmount === 0) {
                newQueue = new Queue();
            } else {
                const promises = [];
                for (const queue of necessaryQueues) {
                    let currResolve;
                    promises.push(new Promise((resolve) => {
                        currResolve = resolve;
                    }));
                    queue.enqueue(async () => {
                        currResolve();
                    });
                }

                newQueue = new Queue().enqueue(async () => {
                    await Promise.all(promises);
                });
                this.#eventTarget.dispatchEvent(new CustomEvent('taskAdded', {
                    detail: necessaryQueues
                }));
            }
             
            for (const storeName of formattedStoreNames) {
                storeToQueueMap.set(storeName, newQueue);
            }

            this.#queueRegistry.queueMetadata.set(newQueue, {
                isRunning: false,
                subscribedStores: new Set(formattedStoreNames)
            });
        }
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

            // Create queues for stores without them
            const storeToQueueMap = this.#queueRegistry.storeToQueueMap;
            if (!storeToQueueMap.get(name)) {
                storeToQueueMap.set(name, new Queue());
            }

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
            if (handler.constructor.name === 'AsyncFunction') throw new Error(`Transaction "${type}" handler "${name}" must be a normal function, but received an "AsyncFunction"`);

            // Handler Registration
            const typeObj = this.#transactionRegistry.configs.get(type);
            if (!isPlainObject(typeObj.handlers)) {
                typeObj.handlers = {};
            }
            typeObj.handlers[name] = handler;
        }
    }

    async #handleTask(typeObj, promises, resolves) {
        // Wait to acquire all of the locks
        await Promise.all(promises);
        
        // Start transaction
        try {
            await this.#transaction({
                storeNames: typeObj.reliesOn,
                mode: typeObj.mode,
                handlers: typeObj.handlers
            }, data);
        // Show a message regarding the error
        } catch(err) {
            // TODO: add a hook to handle transaction failures
            console.error(`${err.name}: ${err.message}`);
        }

        // Release all locks
        for (const resolve of resolves) {
            resolve();
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

    queueTransaction(type, data) {
        const typeObj = this.#transactionRegistry.configs.get(type);
        if (!typeObj) throw new Error(`Passed in a non-existent type: ${type}`);

        // get necessary queues for the transaction
        const necessaryQueues = new Set();
        for (const storeName of typeObj.reliesOn) {
            const queue = this.#queueRegistry.storeToQueueMap.get(storeName);
            if (necessaryQueues.has(queue)) continue;
            necessaryQueues.add(queue);
        }

        // queue transaction
        const transactionId = crypto.randomUUID();
        const promises = [];
        const resolves = [];
        for (const queue of necessaryQueues) {
            let currResolve;
            promises.push(new Promise((resolve) => {
                currResolve = resolve;
            }));
            queue.enqueue(async () => {
                currResolve();

                await new Promise((resolve) => {
                    resolves.push(resolve);
                });

                this.#eventTarget.dispatchEvent(new CustomEvent('taskComplete', {
                    detail: {
                        queue,
                        transactionId
                    }
                }));
            });
        }

        // Process Task
        this.#handleTask(typeObj, promises, resolves);

        this.#transactionRegistry.transactions.set(transactionId, {
            data,
            aborted: false,
            transactionInstance: null
        });
        this.#eventTarget.dispatchEvent(new CustomEvent('taskAdded', {
            detail: necessaryQueues
        }));

        return transactionId;
    }

    onTransactionEnd() {
        
    }

    async #transaction(config, data) {
        if (this.#state !== 'opened') throw new Error(`Cannot perform a transaction: expected the state to be 'opened' but received ${this.#state}`);
        if (this.#upgradeStatus !== 'upgraded') throw new Error(`Cannot perform a transcation: expected the upgradeStatus to be 'upgraded' but received ${this.#upgradeStatus}`);
        if (!isPlainObject(config)) throw new Error('Must pass a valid config object');

        const { storeNames, mode, handlers, options } = config;
        try {
            await new Promise((resolve, reject) => {
                const handler = handlers.handler;
                if (typeof handler !== 'function') throw new Error(`Expected handler to be a function but received ${typeof transactionHandler}`);

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