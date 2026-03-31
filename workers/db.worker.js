import { Database } from "../db/Database.js";
import { isPlainObject } from "../utils/isPlainObject.js";

const dbChannel = new BroadcastChannel('db-channel');
const responsesChannel = new BroadcastChannel('responses');
const requestsMap = new Map();

async function handleDatabaseRequest(data) {
    let method = data.method;
    if (!method) throw new Error('Requested a database request without a specified method');
    if (typeof method !== 'string') throw new Error('Passed in method isn\'t a string');
    method = method.toUpperCase();

    const { id } = data;
    switch (method) {
        case 'GET':
            break;
        case 'POST':
            break;
        case 'PUT':
            break;
        case 'DELETE':
            break;
        default:
            throw new Error('Unknown method');
    }
}

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

    const { type, id, requestId } = request;
    if (type === 'abort-transaction') {
        const abort = requestsMap.get(requestId);
        if (typeof abort === 'function') abort();
        requestsMap.delete(requestId);
    }

    if (!id) {
        console.error('Received a database request without an id');
        return;
    }
    if (!requestId) {
        console.error('Received a database request without a requestId');
        return;
    }
    
    dbChannel.postMessage({
        type: 'handoff-response',
        requestId
    });
    if (requestsMap.has(requestId)) {
        return;
    }
    
    try {
        const abortController = new AbortController();
        navigator.locks.request('db-op', { signal: abortController.signal  }, async () => {
            requestsMap.set(requestId, () => {
                abortController.abort('Aborted Operation');
            });
            if (!requestsMap.has(requestId)) return;
            if (db.isClosed()) await db.open();
            try {
                switch (type) {
                    case 'database-request':
                        await handleDatabaseRequest({
                            id,
                            method: request.method
                        });
                        break;
                    default:
                        throw new Error('Invalid type');
                }
            } catch (error) {
                responsesChannel.postMessage({
                    type: 'database-error',
                    error,
                    id
                });
            }
        });
    } catch(err) {
        console.error(err);
    }
}

self.addEventListener('message', handleDirectMessage);

const db = new Database('primary-db');
dbChannel.addEventListener('message', handleRequest);

self.postMessage({
    type: 'worker-started'
});