export class IDBTransactionProxy {
    constructor(tx) {
        return new Proxy(tx, {
            get(target, prop) {
                if (prop === 'durability' || prop === 'mode' || prop === 'objectStoreNames') {
                    return Reflect.get(target, prop, tx);
                }

                if (prop === 'commit') {
                    return () => tx.commit();
                }

                if (prop === 'objectStore') {
                    return (name) => {
                        const objectStore = tx.objectStore(name);
                        // return a proxy here for an object store
                    };
                }
            },
            set() {
                throw new Error('Cannot modify the properties of the IDBTransaction instance');
            }
        });
    }
}