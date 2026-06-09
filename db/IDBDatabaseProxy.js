import { IDBObjectStoreProxy } from './IDBObjectStoreProxy.js';

export class IDBDatabaseProxy {
    constructor(database, event, handleAbort) {
        return new Proxy(database, {
            get(target, prop) {
                if (prop === 'abortUpgrade') {
                    return handleAbort;
                }

                if (prop === 'oldVersion') {
                    return event.oldVersion;
                }
                
                if (prop === 'name' || prop === 'version' || prop === 'objectStoreNames') {
                    return Reflect.get(target, prop, database);
                }

                if (prop === 'deleteObjectStore') {
                    return (name) => database.deleteObjectStore(name);
                }

                if (prop === 'createObjectStore') {
                    return (name, options) => new IDBObjectStoreProxy('upgrade', target, name, options);
                }

                return undefined;
            },

            set() {
                throw new Error('Cannot modify the database object');
            }
        });
    }
}