import { IDBIndexProxy } from "./IDBIndexProxy.js";

export class IDBObjectStoreProxy {
    constructor(database, name, options) {
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