import { isPlainObject } from "../utils/isPlainObject.js";

const dbChannel = new BroadcastChannel('db-channel');
const responsesChannel = new BroadcastChannel('responses');

self.addEventListener('message', (e) => {
    const port = e.ports[0];
    
    if (port) {
        if (e.data === 'Database Worker Status Check') {
            port.postMessage('Active');
        }
    }
});

dbChannel.addEventListener('message', (e) => {
    const DBRequest = e.data;
    if (!DBRequest) {
        console.error('Received a falsy database request');
        return;
    }
    if (!isPlainObject(DBRequest)) {
        console.error('Received a database request that isn\'t a plain object');
        return;
    }

    const { requestId, type } = DBRequest;
    if (!requestId) {
        console.error('Received a database request without a requestId');
        return;
    }
    dbChannel.postMessage({
        requestId,
        message: 'Success'
    });

    
    navigator.locks.request('db-op', async () => {
        try {
            switch (type) {
                case '':
                    break;
                default:
                    throw new Error('Invalid type');
            }
        } catch (error) {
            responsesChannel.postMessage({
                status: 'Database Error',
                error
            });
        }
    });
});