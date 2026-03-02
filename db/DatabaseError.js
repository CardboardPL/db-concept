export class DatabaseError extends Error {
    constructor(message, payload) {
        super(message);
        this.payload = payload;
    }
} 