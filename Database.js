class Database {
    #db;
    #isOpen = false;
    #name;
    #version;

    constructor(name, version) {
        if (typeof name !== 'string') throw new Error(`Failed to initialize DB: expected name to be of type string but received ${typeof name}`);
        if (typeof version !== 'number' && version != null) throw new Error(`Failed to initialize DB: expected version to be of type number but received ${typeof version}`);
        if (version <= 0) throw new Error('Failed to initialize DB: version number must be a positive integer');
        this.#name = name;
        this.#version = version;
    }

    async open(errorHandler, upgradeHandler) {
        if (this.#isOpen) throw new Error('Tried opening an already opened database');
        
        const DBOpenRequest = indexedDB.open(this.#name, this.#version);
        try {
            this.#db = await new Promise((resolve, reject) => {
                DBOpenRequest.onupgradeneeded = (event) => {
                    if (typeof upgradeHandler === 'function') {
                        upgradeHandler(event);
                    }
                };

                DBOpenRequest.onsuccess = (event) => {
                    resolve(event.target.result);
                };
    
                DBOpenRequest.onerror = (event) => {
                    if (typeof errorHandler === 'function') {
                        errorHandler(event);
                    }
                    reject(event);
                }
            });
        } catch (err) {
            throw new Error(`Failed to open database: ${err}`);
        }

        this.#isOpen = true;
    }

    close() {
        if (!this.#isOpen) throw new Error('Tried closing an already closed database');
        this.#isOpen = false;
        this.#db.close();
    }
}

const db = new Database('db-1', 1);
db.open();