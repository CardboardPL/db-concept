import { Database } from "../db/Database.js";
import { isPlainObject } from "../utils/isPlainObject.js";

const dbChannel = new BroadcastChannel('db-channel');
const responsesChannel = new BroadcastChannel('responses');

function handleDirectMessage(e) {
    const port = e.ports[0];

    if (port) {
        const type = e.data.type;
        if (type === 'heartbeat') {
            port.postMessage({
                type: 'heartbeat-response'
            });
        }
    }
}

function handleRequest(e) {
    const request = e.data;
    if (!request) {
        console.error('Received a falsy database request');
        return;
    }
    if (!isPlainObject(request)) {
        console.error('Received a database request that isn\'t a plain object');
        return;
    }

    const { type, requestId } = request;
    if (!requestId) {
        console.error('Received a database request without a requestId');
        return;
    }
    dbChannel.postMessage({
        type: 'handoff-response',
        requestId
    });
    
    navigator.locks.request('db-op', async () => {
        if (db.isClosed()) await db.open();
        try {
            switch (type) {
                case 'database-request':
                    break;
                default:
                    throw new Error('Invalid type');
            }
        } catch (error) {
            responsesChannel.postMessage({
                type: 'database-error',
                error
            });
        }
    });
}

self.addEventListener('message', handleDirectMessage);

const db = new Database('primary-db');
dbChannel.addEventListener('message', handleRequest);