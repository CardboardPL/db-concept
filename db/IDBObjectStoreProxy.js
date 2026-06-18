import { IDBIndexProxy } from "./IDBIndexProxy.js";

export class IDBObjectStoreProxy {
    #name;
    // Transaction Variant Specific Properties
    #tx;
    #objectStore;
    
    constructor(type, ...args) {
        if (type === 'transaction') {
            return this.#transactionVariant(...args);
        } else if (type === 'upgrade') {
            return this.#upgradeVariant(...args);
        }
        throw new Error('No valid type was provided');
    }

    // ==============================================================================
    // Transaction Variant Methods
    // ==============================================================================
    #handleRuntimeError(err) {
        if (err.name === 'TransactionInactiveError') {
            this.#tx = this.#tx.db.transaction(this.#name, 'readonly');
            this.#objectStore = this.#tx.objectStore(this.#name);
        } else {
            throw err;
        }
    }

    async #executeWithRetry(handler) {
        while (true) {
            try {
                return await handler();
            } catch(err) {
                this.#handleRuntimeError(err);
            }
        }
    }

    #transactionVariant(tx, name, intents) {
        try {
            this.#tx = tx;
            this.#objectStore = tx.objectStore(name);
            this.#name = name;
        } catch(err) {
            this.#handleRuntimeError(err);
        }

        const objectStoreIntents = new Map();
        const fallbackKey = Symbol('objectStoreKeyFallback');
        intents.push({
            objectStoreName: name,
            objectStoreIntents,
            fallbackKey
        });
        
        const methods = {
            add: async (value, key) => {
                let addIntents;
                if (!objectStoreIntents.has('add')) {
                    addIntents = new Map();
                    objectStoreIntents.set('add', addIntents);
                } else {
                    addIntents = objectStoreIntents.get('add');
                }
                
                if (key == null) {
                    if (this.#objectStore.autoIncrement === false) throw new Error('Tried adding an entry without a key while autoIncrement is false');
                    let toAdd = addIntents.get(fallbackKey);
                    if (!toAdd) {
                        toAdd = [];
                        addIntents.set(fallbackKey, toAdd);
                    }
                    toAdd.push(value);
                } else if (addIntents.has(key) || await methods.count(key) > 0) {
                    throw new Error('Tried adding an entry that has an existing key');
                } else {
                    addIntents.set(key, value);
                }
            },
            get: async (key) => {
                return await this.#executeWithRetry(() => new Promise((resolve, reject) => {
                    const addIntents = objectStoreIntents.get('add');
                    if (addIntents && addIntents.has(key)) {
                        resolve(addIntents.get(key));
                        return;
                    }

                    const request = this.#objectStore.get(key);

                    request.onsuccess = () => {
                        resolve(request.result);
                    }
                    request.onerror = () => {
                        reject(request.error);
                    }
                }));
            },
            count: async (key) => {
                return await this.#executeWithRetry(() => new Promise((resolve, reject) => {
                    const request = this.#objectStore.count(key);
                    request.onsuccess = () => {
                        resolve(request.result);
                    };
                    request.onerror = () => {
                        reject(request.error);
                    };
                }));
            },
            clear: () => {
                objectStoreIntents.delete('add');
                objectStoreIntents.set('clear', true);
            }
        };

        return new Proxy({}, {
            get: (target, prop) => {
                if (prop === 'name' || prop === 'keyPath' || prop === 'indexNames' || prop === 'autoIncrement') {
                    return Reflect.get(this.#objectStore, prop, this.#objectStore);
                }

                // TODO: Implement delete(), getAll(), getAllKeys(), getAllRecords(), getKey, index, openCursor(), openKeyCursor(), put() -> make them awaitable
                return methods[prop];
            },

            set() {
                throw new TypeError('This IDBObjectStore instance is read-only');
            }
        });
    }

    // ==============================================================================
    // Upgrade Variant Methods
    // ==============================================================================
    #upgradeVariant(database, name, options) {
        const objectStore = database.createObjectStore(name, options);
        return new Proxy(objectStore, {
            get(target, prop) {
                if (prop === 'name' || prop === 'keyPath' || prop === 'indexNames' || prop === 'autoIncrement' || prop === 'deleteIndex') {
                    return Reflect.get(target, prop, objectStore);
                }

                if (prop === 'createIndex') {
                    return (indexName, keyPath, options) => new IDBIndexProxy(objectStore, indexName, keyPath, options);
                }

                return undefined;
            },

            set(target, prop, value) {
                if (prop !== 'name') throw new Error(`Cannot modify the "${prop}" property of the IDBObjectStore instance`);
                if (typeof value !== 'string' || !value.trim()) throw new Error(`Expected value to be a non-empty string but received: ${value}`);
                Reflect.set(target, prop, value, objectStore);
                return true;
            }
        });
    }
}