import { IDBObjectStoreProxy } from "./IDBObjectStoreProxy.js";

export class IDBTransactionProxy {
    constructor(tx, intents) {
        return new Proxy(tx, {
            get(target, prop) {
                if (prop === 'durability' || prop === 'mode' || prop === 'objectStoreNames') {
                    return Reflect.get(target, prop, tx);
                }

                // Reassess this uses... and/or refactor how it will behave
                if (prop === 'commit') {
                    return () => tx.commit();
                }

                if (prop === 'objectStore') {
                    return (name) => new IDBObjectStoreProxy('transaction', tx, intents, name);
                }
            },
            set() {
                throw new Error('Cannot modify the properties of the IDBTransaction instance');
            }
        });
    }
}