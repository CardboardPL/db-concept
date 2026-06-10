import { IDBIndexProxy } from "./IDBIndexProxy.js";

export class IDBObjectStoreProxy {
    constructor(type, ...args) {
        if (type === 'transaction') {
            return this.#transactionVariant(...args);
        } else if (type === 'upgrade') {
            return this.#upgradeVariant(...args);
        }
        throw new Error('No valid type was provided');
    }

    #transactionVariant(tx, intents, name) {
        const objectStore = tx.objectStore(name);
        const objectStoreIntents = new Map();
        intents.push({
            objectStoreName: name,
            objectStoreIntents
        });
        
        const methods = {
            add: (value, key) => { objectStoreIntents.set(key, value)},
        };

        return new Proxy(objectStore, {
            get(target, prop) {
                if (prop === 'name' || prop === 'keyPath' || prop === 'indexNames' || prop === 'autoIncrement') {
                    return Reflect.get(target, prop, objectStore);
                }

                // TODO: Implement add(), clear(), count(), delete(), get(), getAll(), getAllKeys(), getAllRecords(), getKey, index, openCursor(), openKeyCursor(), put() -> make them awaitable
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