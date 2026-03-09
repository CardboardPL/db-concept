import { Database } from "./Database.js";

export class DatabaseRegistry {
    #map;

    constructor() {
        this.#map = new Map();
    }

    registerConnection(id) {

    }

    deregisterConnection(id) {

    }

    async requestTransaction(name, id, transactionHandler) {

    }

    async requestUpgrade(name, id, upgradeHandler) {

    }
}