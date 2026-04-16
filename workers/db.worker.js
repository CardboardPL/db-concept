import { Database } from "../db/Database.js";
import { isPlainObject } from "../utils/isPlainObject.js";

const dbChannel = new BroadcastChannel('db-channel');
const responsesChannel = new BroadcastChannel('responses');
const requestsMap = new Map();

// Handler Lookups
const operationHandlers = {

}
const typeHandlers = {
    'database-request': handleDatabaseRequest
};

function handleUpgradeNeeded(event) {
    const db = event.target.result;

    // Task Manager
    /* Categories Schema
        categoryId,
        categoryName,
        createdAt,
        lastUpdatedAt
    */
   const taskCategoryStore = db.createObjectStore('taskCategories', { keyPath: 'categoryId' });
   taskCategoryStore.createIndex('categoryName', 'categoryName', { unique: true });
   taskCategoryStore.createIndex('createdAt', 'createdAt', { unique: false });
   taskCategoryStore.createIndex('lastUpdatedAt', 'lastUpdatedAt', { unique: false });

   /* taskCategoryLinks Schema
        categoryId,
        headProjectId,
        tailProjectId,
        prevCategoryId
        nextCategoryId,
   */
    const taskCategoryLinksStore = db.createObjectStore('taskCategoryLinks', { keyPath: 'categoryId' });
    taskCategoryLinksStore.createIndex('headProjectId', 'headProjectId', { unique: true });
    taskCategoryLinksStore.createIndex('tailProjectId', 'tailProjectId', { unique: true });
    taskCategoryLinksStore.createIndex('prevCategoryId', 'prevCategoryId', { uniqe: true });
    taskCategoryLinksStore.createIndex('nextCategoryId', 'nextCategoryId', { unique: true });

    // TODO: WORK ON PROJECT SCHEMAS

    /* Tasks Schema
        taskId,
        title,
        description,
        dueDate,
        status,
        createdAt,
        lastUpdatedAt
    */
    const tasksStore = db.createObjectStore('tasks', { keyPath: 'taskId' });
    tasksStore.createIndex('title', 'title', { unique: false });
    tasksStore.createIndex('dueDate', 'dueDate', { unique: false });
    tasksStore.createIndex('status', 'status', { unique: false });
    tasksStore.createIndex('createdAt', 'createdAt', { unique: false });
    tasksStore.createIndex('lastUpdatedAt', 'lastUpdatedAt', { unique: false });

    /* TaskLinks Schema
        taskId,
        parentTaskId,
        parentProjectId,
        prevTaskId,
        nextTaskId,
        headSubTaskId,
        tailSubTaskId
    */
    const taskLinksStore = db.createObjectStore('taskLinks', { keyPath: 'taskId' });
    taskLinksStore.createIndex('parentTaskId', 'parentTaskId', { unique: false });
    taskLinksStore.createIndex('parentProjectId', 'parentProjectId', { unique: false });
    taskLinksStore.createIndex('prevTaskId', 'prevTaskId', { unique: true });
    taskLinksStore.createIndex('nextTaskId', 'nextTaskId', { unique: true });
    taskLinksStore.createIndex('headSubTaskId', 'headSubTaskId', { unique: true });
    taskLinksStore.createIndex('tailSubTaskId', 'tailSubTaskId', { unique: true });

    // TODO: WORK ON TAG SCHEMAS
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
        if (db.isClosed()) await db.open({
            onupgradeneeded: handleUpgradeNeeded
        });

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
    } catch(err) {
        console.error(err);
        responsesChannel.postMessage({
            type: 'database-error',
            error: err.message,
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