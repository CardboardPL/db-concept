import { Database } from "../db/Database.js";
import { isPlainObject } from "../utils/isPlainObject.js";

const dbChannel = new BroadcastChannel('db-channel');
const responsesChannel = new BroadcastChannel('responses');
const requestsMap = new Map();

const operationHandlers = {

}
function handleDatabaseRequest(data) {
    // Abort Handling
    const requestId = data.requestId;
    const abortController = new AbortController();
    requestsMap.set(requestId, () => {
        db.abortCurrentTransaction();
        abortController.abort('Aborted Operation');
    });

    // Request Handling
    return navigator.locks.request('db-op', { signal: abortController.signal  }, async () => { 
        if (!requestsMap.has(requestId)) return;
        if (db.isClosed()) await db.open();

        let op = data.op;
        if (!op) throw new Error('Requested a database request without a specified op');
        if (typeof op !== 'string') throw new Error('Passed in an op that isn\'t a string');
        op = op.toUpperCase();

        const handler = operationHandlers[op];
        if (typeof handler !== 'function') throw new Error('Invalid op');
        await handler({
            id: data.id
        });
    });
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

const typeHandlers = {
    'database-request': handleDatabaseRequest
};
async function handleRequest(e) {
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
    if (type === 'abort-transaction') {
        const abort = requestsMap.get(requestId);
        if (typeof abort === 'function') abort();
        requestsMap.delete(requestId);
        return;
    }

    const { id } = request;
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
        console.warn('Possible duplicate request', request);
        return;
    }
    
    try {
        const handler = typeHandlers[type]
        if (typeof handler !== 'function') throw new Error('Invalid type');
        await handler({
            id,
            requestId,
            op: request.op
        });
    } catch(error) {
        console.error(error);
        responsesChannel.postMessage({
            type: 'database-error',
            error,
            id
        });
    }
}

self.addEventListener('message', handleDirectMessage);

const db = new Database('primary-db');
dbChannel.addEventListener('message', handleRequest);

self.postMessage({
    type: 'worker-started'
});