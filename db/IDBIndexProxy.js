export class IDBIndexProxy {
    constructor(objectStore, indexName, keyPath, options) {
        const index = objectStore.createIndex(indexName, keyPath, options);
        return new Proxy(index, {
            get(target, prop) {
                if (prop === 'isAutoLocale' || prop === 'locale' || prop === 'name' || prop === 'keyPath' || prop === 'multiEntry' || prop === 'unique') {
                    return Reflect.get(target, prop, index);
                }
                return undefined;
            },

            set(target, prop, value) {
                if (prop !== 'name') throw new Error(`Cannot modify the "${prop}" property of the IDBIndex instance`);
                if (typeof value !== 'string' || !value.trim()) throw new Error(`Expected value to be a non-empty string but received: ${value}`);
                Reflect.set(target, prop, value, index);
                return true;
            }
        });
    }
}