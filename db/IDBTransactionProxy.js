import { IDBObjectStoreProxy } from "./IDBObjectStoreProxy.js";

export class IDBTransactionProxy {
    constructor(tx, intents) {
        return new Proxy(tx, {
            get(target, prop) {
                if (prop === 'durability' || prop === 'mode' || prop === 'objectStoreNames') {
                    return Reflect.get(target, prop, tx);
                }

                if (prop === 'objectStore') {
                    return (name) => new IDBObjectStoreProxy('transaction', tx, name, intents);
                }
            },
            set() {
                throw new Error('Cannot modify the properties of the IDBTransaction instance');
            }
        });
    }
}