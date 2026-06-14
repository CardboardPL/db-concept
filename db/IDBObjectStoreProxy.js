import { IDBIndexProxy } from "./IDBIndexProxy.js";

export class IDBObjectStoreProxy {
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

    #reinitializeTransaction(db, name) {
        this.#tx = db.transaction(name, 'readonly');
        this.#objectStore = this.#tx.objectStore(name);
    }


    #transactionVariant(tx, name, intents) {
        try {
            this.#tx = tx;
            this.#objectStore = tx.objectStore(name);
        } catch(err) {
            if (err.name === 'TransactionInactiveError') {
                this.#reinitializeTransaction(tx.db, name);
            } else {
                throw err;
            }
        }

        const objectStoreIntents = new Map();
        intents.push({
            objectStoreName: name,
            objectStoreIntents
        });
        
        const methods = {
            add: (value, key) => {
                let addIntents;
                if (!objectStoreIntents.has('add')) {
                    addIntents = new Map();
                    objectStoreIntents.set('add', addIntents);
                }
                
                addIntents.set(key, value);
            },
            get: (key) => {
                return new Promise((resolve, reject) => {
                    try {
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
                    } catch(err) {
                        if (err.name === 'TransactionInactiveError') {
                            this.#reinitializeTransaction(this.#tx.db, name);
                            return methods.get(key);
                        }
                        throw err
                    }
                });
            },
            clear() {
                objectStoreIntents.delete('add');
                objectStoreIntents.set('clear', true);
            }
        };

        const retrieveProperties = (prop) => {
            return Reflect.get(this.#objectStore, prop, this.#objectStore);
        }

        return new Proxy({}, {
            get(target, prop) {
                if (prop === 'name' || prop === 'keyPath' || prop === 'indexNames' || prop === 'autoIncrement') {
                    return retrieveProperties(prop)
                }

                // TODO: Implement count(), delete(), getAll(), getAllKeys(), getAllRecords(), getKey, index, openCursor(), openKeyCursor(), put() -> make them awaitable
                return methods[prop];
            },

            set() {
                throw new TypeError('This IDBObjectStore instance is read-only');
            }
        });
    }

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