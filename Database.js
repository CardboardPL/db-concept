class Database {
    #db;
    #isOpen = false;
    #name;
    #version;

    constructor(name, version) {
        if (typeof name !== 'string') throw new Error(`Failed to initialize DB: expected name to be of type string but received ${typeof name}`);
        if (typeof version !== 'number' && version != null) throw new Error(`Failed to initialize DB: expected version to be of type number but received ${typeof version}`);
        this.#name = name;
        this.#version = version;
    }

    open() {

    }

    close() {
        
    }
}