import { Database } from "./Database.js";

export class DatabaseRegistry {
    #map;

    constructor() {
        this.#map = new Map();
    }

    async requestTransaction(name, id, transactionHandler) {
        let db = this.#map.get(name);
        if (!db) {
            db = new Database(name);
            this.#map.set(name, db);
            await db.open();
        }

        const { storeNames, mode, options, handlers } = transactionHandler;
        db.transaction(storeNames, mode, options, handlers);
    }

    async requestUpgrade(name, id, upgradeHandler) {

    }
}